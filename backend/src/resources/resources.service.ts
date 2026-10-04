import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryResourceDto } from './dto/query-resource.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { AuthUser } from '../auth/auth-user';
import { ResourceStatus, ResourceType, Role } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { getExtensionForMime, getFileType, matchesMagicBytes, normalizeMime } from './file-types.config';
import { normalizeTags } from './dto/create-resource.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  slugify(text: string) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async findAll(query: QueryResourceDto, user?: AuthUser) {
    const { search, campusId, schoolId, subjectId, type, level, semester, year } = query;
    let { status } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    const isPrivileged = user && (user.role === Role.ADMIN || user.role === Role.MODERATOR);
    if (!isPrivileged) status = ResourceStatus.APPROVED;
    else if (!status) status = undefined;

    const andFilters: any[] = [];
    if (status) andFilters.push({ status });
    if (campusId) andFilters.push({ campusId });
    if (schoolId) andFilters.push({ schoolId });
    if (subjectId) andFilters.push({ subjectId });
    if (type) andFilters.push({ type });
    if (level) andFilters.push({ level });
    if (semester) andFilters.push({ semester });
    if (year) andFilters.push({ year: Number(year) });

    let searchOr: any[] | null = null;
    if (search && search.trim().length >= 2) {
      const s = search.trim();
      // Tags normalisés en minuscules à l'écriture ; on cherche les deux formes
      // pour rester compatible avec les données historiques en casse mixte.
      searchOr = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { tags: { has: s } },
        { tags: { has: s.toLowerCase() } },
        { fileName: { contains: s, mode: 'insensitive' } },
      ];
      const maybeYear = Number(s);
      if (!isNaN(maybeYear) && maybeYear >= 2000 && maybeYear <= 2030) searchOr.push({ year: maybeYear });
      const [sch, subj] = await Promise.all([
        this.prisma.school.findMany({ where: { name: { contains: s, mode: 'insensitive' } }, select: { id: true }, take: 20 }),
        this.prisma.subject.findMany({ where: { name: { contains: s, mode: 'insensitive' } }, select: { id: true }, take: 20 }),
      ]);
      if (sch.length) searchOr.push({ schoolId: { in: sch.map(x => x.id) } });
      if (subj.length) searchOr.push({ subjectId: { in: subj.map(x => x.id) } });
    }

    const where: any = {};
    if (andFilters.length) where.AND = andFilters;
    if (searchOr) {
      if (where.AND) where.AND.push({ OR: searchOr });
      else where.OR = searchOr;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        include: {
          campus: { select: { id: true, name: true, slug: true } },
          school: { select: { id: true, name: true, slug: true, color: true } },
          subject: { select: { id: true, name: true, slug: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(slugOrId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
      include: {
        campus: { select: { id: true, name: true, slug: true } },
        school: { select: { id: true, name: true, slug: true, color: true } },
        subject: { select: { id: true, name: true, slug: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    if (!resource) throw new NotFoundException('Ressource non trouvée');
    return resource;
  }

  private verifyMagicBytes(buffer: Buffer, mime: string) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      throw new BadRequestException('Fichier invalide (fichier vide ou illisible)');
    }
    const normalized = normalizeMime(mime);
    const ft = normalized ? getFileType(normalized) : undefined;
    if (!ft) {
      throw new BadRequestException(`Type de fichier non supporté: ${mime}. Types acceptés : PDF, PNG, JPEG, WEBP`);
    }
    if (!matchesMagicBytes(buffer, normalized!)) {
      // message générique mais précis par type
      if (normalized === 'application/pdf') {
        throw new BadRequestException('Fichier PDF invalide (magic bytes %PDF attendu)');
      }
      if (normalized === 'image/png') {
        throw new BadRequestException('Fichier PNG invalide (magic bytes PNG attendu)');
      }
      if (normalized === 'image/jpeg') {
        throw new BadRequestException('Fichier JPEG invalide (magic bytes JPEG attendu)');
      }
      if (normalized === 'image/webp') {
        throw new BadRequestException('Fichier WEBP invalide (magic bytes RIFF....WEBP attendu)');
      }
      throw new BadRequestException(`Fichier invalide : contenu ne correspond pas au type déclaré ${mime}`);
    }
  }

  async create(dto: CreateResourceDto, file: Express.Multer.File, userId?: string) {
    if (!file || !file.buffer) throw new BadRequestException('Fichier requis (PDF, PNG, JPEG, WEBP — 10 Mo max)');
    // Magic bytes via buffer + vérif cohérence mime/bytes (anti-spoofing)
    this.verifyMagicBytes(file.buffer, file.mimetype);

    // Cohérence hiérarchie Campus → School → Subject (parallélisé)
    const [school, subject] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: dto.schoolId }, select: { campusId: true } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { schoolId: true } }),
    ]);
    if (!school) throw new BadRequestException('École invalide');
    if (school.campusId !== dto.campusId) throw new BadRequestException('Le campus, l’école et la matière sélectionnés ne sont pas cohérents.');
    if (!subject) throw new BadRequestException('Matière invalide');
    if (subject.schoolId !== dto.schoolId) throw new BadRequestException('Le campus, l’école et la matière sélectionnés ne sont pas cohérents.');

    const baseSlug = this.slugify(dto.title);
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.resource.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${baseSlug}-${counter++}`;
      if (counter > 100) throw new BadRequestException('Slug collision');
    }
    let parsedTags: string[] = [];
    if (Array.isArray(dto.tags)) parsedTags = dto.tags;
    parsedTags = normalizeTags(parsedTags);

    // Extension déterminée à partir du mimetype validé (jamais du nom original)
    const normalized = normalizeMime(file.mimetype);
    const ext = normalized ? getExtensionForMime(normalized) : undefined;
    if (!ext) throw new BadRequestException(`Type de fichier non supporté: ${file.mimetype}`);
    // Génération key sécurisée côté serveur (uuid + ext, jamais dérivée du nom original)
    const key = this.storage.generateResourceKey(ext);
    const fileName = key.split('/').pop()!;

    // Upload direct vers R2 (buffer -> S3, pas de disque)
    try {
      await this.storage.uploadFile(file.buffer, key, file.mimetype);
    } catch (e: any) {
      this.logger.error(`Upload R2 échoué key=${key}: ${e?.message}`, e?.stack);
      // Le provider log déjà détail infra; on renvoie générique au client
      throw new InternalServerErrorException('Erreur lors de l\'upload du fichier');
    }

    // Création DB — si échec, on tente de supprimer l'objet R2 pour éviter orphelin
    try {
      return await this.prisma.resource.create({
        data: {
          title: dto.title, slug, description: dto.description, type: dto.type,
          level: dto.level, semester: dto.semester, year: dto.year ? Number(dto.year) : null,
          tags: parsedTags, fileName, filePath: key,
          fileSize: file.size, mimeType: file.mimetype,
          campusId: dto.campusId, schoolId: dto.schoolId, subjectId: dto.subjectId,
          uploadedById: userId || null, status: ResourceStatus.PENDING,
        },
      });
    } catch (e: any) {
      this.logger.error(`Prisma create échoué après upload R2 key=${key}: ${e?.message}`);
      // rollback R2 (best-effort)
      try { await this.storage.deleteFile(key); } catch (delErr: any) {
        this.logger.error(`Rollback R2 delete échoué key=${key}: ${delErr?.message}`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateResourceDto, user?: AuthUser) {
    const existing = await this.prisma.resource.findUnique({ where: { id }, select: { uploadedById: true } });
    if (!existing) throw new NotFoundException('Ressource non trouvée');
    // Ownership strict : ADMIN libre, MODERATOR uniquement si uploadedById === son id.
    // Les ressources orphelines (uploadedById null) sont réservées à l'admin (pas de fail-open).
    if (user?.role !== Role.ADMIN && existing.uploadedById !== user?.id) {
      throw new ForbiddenException('Action non autorisée');
    }
    // Champs scalaires + FK dénormalisées (écriture unchecked Prisma : scalaires directs).
    const data: {
      title?: string;
      description?: string;
      type?: ResourceType;
      level?: string;
      semester?: string;
      year?: number;
      tags?: string[];
      campusId?: string;
      schoolId?: string;
      subjectId?: string;
    } = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.semester !== undefined) data.semester = dto.semester;
    if (dto.year !== undefined) data.year = Number(dto.year);
    if (dto.tags !== undefined) data.tags = normalizeTags(Array.isArray(dto.tags) ? dto.tags : []);
    if (dto.campusId || dto.schoolId || dto.subjectId) {
      const current = await this.prisma.resource.findUnique({ where: { id }, select: { campusId: true, schoolId: true, subjectId: true } });
      const campusId = dto.campusId || current?.campusId;
      const schoolId = dto.schoolId || current?.schoolId;
      const subjectId = dto.subjectId || current?.subjectId;
      const [school, subject] = await Promise.all([
        this.prisma.school.findUnique({ where: { id: schoolId }, select: { campusId: true } }),
        this.prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } }),
      ]);
      if (!school || !subject || school.campusId !== campusId || subject.schoolId !== schoolId) {
        throw new BadRequestException('Le campus, l’école et la matière sélectionnés ne sont pas cohérents.');
      }
      data.campusId = campusId; data.schoolId = schoolId; data.subjectId = subjectId;
    }
    return this.prisma.resource.update({ where: { id }, data });
  }

  async remove(id: string, user?: AuthUser) {
    const res = await this.prisma.resource.findUnique({ where: { id }, select: { fileName: true, filePath: true, uploadedById: true } });
    if (!res) throw new NotFoundException();
    // Même règle stricte qu'en update (pas de fail-open sur orphelines).
    if (user?.role !== Role.ADMIN && res.uploadedById !== user?.id) {
      throw new ForbiddenException('Action non autorisée');
    }
    const key = res.filePath || res.fileName;
    try {
      await this.storage.deleteFile(key);
    } catch (e: any) {
      this.logger.error(`R2 delete échoué key=${key}: ${e?.message}`, e?.stack);
      // On ne bloque pas la suppression DB si R2 échoue (fichier peut déjà être absent)
      // Mais on log et on continue — la réponse API reste générique
    }
    return this.prisma.resource.delete({ where: { id } });
  }

  async approve(id: string) { return this.prisma.resource.update({ where: { id }, data: { status: ResourceStatus.APPROVED } }); }
  async reject(id: string) { return this.prisma.resource.update({ where: { id }, data: { status: ResourceStatus.REJECTED } }); }

  async incrementDownload(id: string) {
    return this.prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
  }

  private readonly downloadDedup = new Map<string, number>();
  private static readonly DOWNLOAD_DEDUP_MS = 10 * 60 * 1000;

  /**
   * Compteur de téléchargements sans bloquer la réponse : déduplique par
   * (ip, ressource) sur 10 min et ignore les requêtes Range (reprises).
   * À appeler en fire-and-forget (erreurs loggées, jamais propagées).
   */
  async countDownloadOnce(id: string, ip?: string, isRange = false): Promise<void> {
    if (isRange) return;
    const now = Date.now();
    const entryKey = `${ip || 'unknown'}|${id}`;
    if (now - (this.downloadDedup.get(entryKey) ?? 0) < ResourcesService.DOWNLOAD_DEDUP_MS) return;
    this.downloadDedup.set(entryKey, now);
    if (this.downloadDedup.size > 5000) {
      for (const [key, at] of this.downloadDedup) {
        if (now - at >= ResourcesService.DOWNLOAD_DEDUP_MS) this.downloadDedup.delete(key);
        if (this.downloadDedup.size <= 4000) break;
      }
    }
    try {
      await this.prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
    } catch (e: unknown) {
      this.logger.error(`incrementDownload échoué id=${id}: ${(e as Error)?.message}`);
    }
  }

  async stats() {
    const [total, pending, approved, rejected] = await this.prisma.$transaction([
      this.prisma.resource.count(),
      this.prisma.resource.count({ where: { status: ResourceStatus.PENDING } }),
      this.prisma.resource.count({ where: { status: ResourceStatus.APPROVED } }),
      this.prisma.resource.count({ where: { status: ResourceStatus.REJECTED } }),
    ]);
    return { total, pending, approved, rejected };
  }
}
