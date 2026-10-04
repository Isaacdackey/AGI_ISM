import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';
import { Prisma } from '@prisma/client';
@Injectable()
export class CampusesService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.campus.findMany({
      select: {
        id: true, name: true, slug: true, description: true, address: true,
        _count: { select: { schools: true, resources: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
  findOne(slug: string) {
    return this.prisma.campus
      .findUnique({ where: { slug }, include: { schools: { include: { subjects: true } } } })
      .then((campus) => {
        if (!campus) throw new NotFoundException('Campus non trouvé');
        return campus;
      });
  }
  create(dto: CreateCampusDto) {
    const data: Prisma.CampusCreateInput = { name: dto.name, slug: dto.slug, description: dto.description, address: dto.address };
    return this.prisma.campus.create({ data });
  }
  update(id: string, dto: UpdateCampusDto) {
    const data: Prisma.CampusUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.address !== undefined) data.address = dto.address;
    return this.prisma.campus.update({ where: { id }, data });
  }
  async remove(id: string) {
    const used = await this.prisma.resource.count({ where: { campusId: id } });
    if (used > 0) {
      throw new ConflictException('Suppression impossible : des ressources existent. Supprimez ou déplacez-les d’abord.');
    }
    return this.prisma.campus.delete({ where: { id } });
  }
}
