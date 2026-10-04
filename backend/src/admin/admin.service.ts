import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../common/utils/bcrypt-cost';
import { generateStrongPassword } from '../common/utils/generate-password.util';
import { CreateModeratorDto } from './dto/create-moderator.dto';
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  async stats() {
    const [campuses, schools, subjects, resources, pending, users, downloads] = await Promise.all([
      this.prisma.campus.count(),
      this.prisma.school.count(),
      this.prisma.subject.count(),
      this.prisma.resource.count(),
      this.prisma.resource.count({ where: { status: ResourceStatus.PENDING } }),
      this.prisma.user.count(),
      this.prisma.resource.aggregate({ _sum: { downloadCount: true } }),
    ]);
    return { campuses, schools, subjects, resources, pending, users, downloads: downloads._sum.downloadCount || 0 };
  }
  async pendingResources() {
    return this.prisma.resource.findMany({ where: { status: ResourceStatus.PENDING }, include: { school: true, subject: true, campus: true }, orderBy: { createdAt: 'desc' } });
  }

  async createModerator(dto: CreateModeratorDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const temporaryPassword = generateStrongPassword(12);
    const hashed = await bcrypt.hash(temporaryPassword, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        password: hashed,
        role: Role.MODERATOR,
        mustChangePassword: true,
      },
    });

    const { password, ...result } = user;
    // Mot de passe en clair renvoyé une seule fois, jamais loggé ni stocké
    return { user: result, temporaryPassword };
  }

  /** Introuvable ⇒ 404 ; ADMIN ou soi-même ⇒ 403. */
  private async moderableTarget(id: string, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Modérateur non trouvé');
    if (target.id === actorId) throw new ForbiddenException('Action impossible sur votre propre compte');
    if (target.role !== Role.MODERATOR) throw new ForbiddenException('Action réservée aux modérateurs');
    return target;
  }

  async disableModerator(id: string, actorId: string) {
    await this.moderableTarget(id, actorId);
    // tokenVersion++ : les tokens existants sont révoqués immédiatement.
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    const { password, ...result } = user;
    return result;
  }

  async enableModerator(id: string, actorId: string) {
    await this.moderableTarget(id, actorId);
    const user = await this.prisma.user.update({ where: { id }, data: { isActive: true } });
    const { password, ...result } = user;
    return result;
  }

  async resetModeratorPassword(id: string, actorId: string) {
    await this.moderableTarget(id, actorId);
    const temporaryPassword = generateStrongPassword(12);
    const hashed = await bcrypt.hash(temporaryPassword, BCRYPT_COST);
    const user = await this.prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    const { password, ...result } = user;
    // Mot de passe en clair renvoyé une seule fois, jamais loggé ni stocké
    return { user: result, temporaryPassword };
  }

  async listModerators() {
    return this.prisma.user.findMany({
      where: { role: Role.MODERATOR },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
