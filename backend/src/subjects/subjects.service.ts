import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Prisma, Role } from '@prisma/client';
@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}
  findAll(schoolId?: string, campusId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (campusId) where.school = { campusId };
    return this.prisma.subject.findMany({ where, include: { school: { select: { id: true, name: true, slug: true, campusId: true } }, _count: { select: { resources: true } } }, orderBy: { name: 'asc' } });
  }
  findOne(slug: string) {
    return this.prisma.subject
      .findUnique({ where: { slug }, include: { school: { select: { id: true, name: true, slug: true } }, _count: { select: { resources: true } } } })
      .then((subject) => {
        if (!subject) throw new NotFoundException('Matière non trouvée');
        return subject;
      });
  }
  findById(id: string) { return this.prisma.subject.findUnique({ where: { id }, select: { id: true, name: true, slug: true, schoolId: true } }); }
  create(dto: CreateSubjectDto) {
    const data: Prisma.SubjectCreateInput = {
      name: dto.name, slug: dto.slug, code: dto.code, description: dto.description,
      school: { connect: { id: dto.schoolId } },
    };
    return this.prisma.subject.create({ data });
  }
  async update(id: string, dto: UpdateSubjectDto, user?: { role?: Role }) {
    // Changer d'école est réservé à l'ADMIN (cohérence des ressources dénormalisées).
    if (dto.schoolId !== undefined && user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Seul un administrateur peut changer l’école d’une matière');
    }
    if (dto.schoolId !== undefined) {
      const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId }, select: { id: true, campusId: true } });
      if (!school) throw new BadRequestException('École invalide');
      // Déplacement : matière + schoolId/campusId dénormalisés de ses ressources, en transaction.
      await this.prisma.$transaction([
        this.prisma.subject.update({ where: { id }, data: { school: { connect: { id: dto.schoolId } } } }),
        this.prisma.resource.updateMany({
          where: { subjectId: id },
          data: { schoolId: dto.schoolId, campusId: school.campusId },
        }),
      ]);
    }
    const data: Prisma.SubjectUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.subject.update({ where: { id }, data });
  }
  async remove(id: string) {
    const used = await this.prisma.resource.count({ where: { subjectId: id } });
    if (used > 0) {
      throw new ConflictException('Suppression impossible : des ressources existent. Supprimez ou déplacez-les d’abord.');
    }
    return this.prisma.subject.delete({ where: { id } });
  }
}
