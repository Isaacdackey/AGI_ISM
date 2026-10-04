import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { Prisma, Role } from '@prisma/client';
@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}
  findAll(campusId?: string) {
    const where = campusId ? { campusId } : {};
    return this.prisma.school.findMany({ where, include: { campus: { select: { id: true, name: true, slug: true } }, _count: { select: { subjects: true, resources: true } } }, orderBy: { name: 'asc' } });
  }
  findOne(slug: string) {
    return this.prisma.school
      .findUnique({ where: { slug }, include: { campus: { select: { id: true, name: true, slug: true } }, subjects: { orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }, _count: { select: { resources: true } } } })
      .then((school) => {
        if (!school) throw new NotFoundException('École non trouvée');
        return school;
      });
  }
  findById(id: string) { return this.prisma.school.findUnique({ where: { id }, select: { id: true, name: true, slug: true, campusId: true } }); }
  create(dto: CreateSchoolDto) {
    const data: Prisma.SchoolCreateInput = {
      name: dto.name, slug: dto.slug, description: dto.description, color: dto.color,
      campus: { connect: { id: dto.campusId } },
    };
    return this.prisma.school.create({ data });
  }
  async update(id: string, dto: UpdateSchoolDto, user?: { role?: Role }) {
    // Changer de campus est réservé à l'ADMIN (cohérence des ressources dénormalisées).
    if (dto.campusId !== undefined && user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Seul un administrateur peut changer le campus d’une école');
    }
    if (dto.campusId !== undefined) {
      const campus = await this.prisma.campus.findUnique({ where: { id: dto.campusId }, select: { id: true } });
      if (!campus) throw new BadRequestException('Campus invalide');
      // Déplacement : école + campusId dénormalisé de ses ressources, en transaction.
      await this.prisma.$transaction([
        this.prisma.school.update({ where: { id }, data: { campus: { connect: { id: dto.campusId } } } }),
        this.prisma.resource.updateMany({ where: { schoolId: id }, data: { campusId: dto.campusId } }),
      ]);
    }
    const data: Prisma.SchoolUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.color !== undefined) data.color = dto.color;
    return this.prisma.school.update({ where: { id }, data });
  }
  async remove(id: string) {
    const used = await this.prisma.resource.count({ where: { schoolId: id } });
    if (used > 0) {
      throw new ConflictException('Suppression impossible : des ressources existent. Supprimez ou déplacez-les d’abord.');
    }
    return this.prisma.school.delete({ where: { id } });
  }
}
