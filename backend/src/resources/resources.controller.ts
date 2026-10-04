import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ResourcesService } from './resources.service';
import { ALLOWED_EXTS, getAllowedExtsForMime, normalizeMime } from './file-types.config';
import { QueryResourceDto } from './dto/query-resource.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, ResourceStatus } from '@prisma/client';
import { AuthUser, AuthenticatedRequest } from '../auth/auth-user';
import { Throttle } from '@nestjs/throttler';
import { StorageService } from '../storage/storage.service';
import { Response, Request } from 'express';

function fileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new BadRequestException('Nom de fichier invalide'), false);
  }
  const ext = extname(file.originalname).toLowerCase();
  const normalized = normalizeMime(file.mimetype);
  if (!normalized) {
    return cb(
      new BadRequestException('Type de fichier non autorisé. Types acceptés : PDF, PNG, JPEG, WEBP (10 Mo max)'),
      false,
    );
  }
  // l'extension doit être autorisée globalement
  if (!ALLOWED_EXTS.includes(ext)) {
    return cb(
      new BadRequestException('Extension non autorisée. Extensions acceptées : .pdf, .png, .jpg, .jpeg, .webp (10 Mo max)'),
      false,
    );
  }
  // et cohérente avec le mimetype déclaré (anti-spoof extension)
  const allowedForMime = normalized ? getAllowedExtsForMime(normalized) : [];
  if (allowedForMime.length > 0 && !allowedForMime.includes(ext)) {
    return cb(
      new BadRequestException(`Extension ${ext} incohérente avec le type ${file.mimetype}. Types acceptés : PDF, PNG, JPEG, WEBP`),
      false,
    );
  }
  cb(null, true);
}

const RAW_MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
// Borne haute imposée : jamais plus de 10 Mo (anti-DoS RAM avec memoryStorage)
const MAX_FILE_SIZE = Math.min(Math.max(1, RAW_MAX_FILE_SIZE), 10 * 1024 * 1024);

function safeDownloadFilename(name: string): string {
  const base = (name || 'fichier').split('/').pop()!.split('\\').pop()!;
  const clean = base.replace(/[\r\n";]/g, '').slice(0, 120) || 'fichier';
  return encodeURIComponent(clean);
}

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);
  constructor(
    private resources: ResourcesService,
    private storage: StorageService,
  ) {}

  /** Ressource visible : APPROVED pour tous, sinon rôles privilégiés uniquement (404 générique). */
  private isVisible(resource: { status: ResourceStatus }, user?: AuthUser): boolean {
    if (resource.status === ResourceStatus.APPROVED) return true;
    return !!user && (user.role === Role.ADMIN || user.role === Role.MODERATOR);
  }

  @Public()
  @Get()
  findAll(@Query() query: QueryResourceDto, @Req() req: Request) {
    const user = (req as unknown as AuthenticatedRequest).user;
    return this.resources.findAll(query, user);
  }

  @Public()
  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Req() req: Request) {
    const user = (req as unknown as AuthenticatedRequest).user;
    const resource = await this.resources.findOne(slug);
    if (!this.isVisible(resource, user)) throw new NotFoundException('Ressource non trouvée');
    return resource;
  }

  /**
   * GET /resources/:id/download
   * Stratégie:
   *  - Par défaut: redirect 302 vers URL signée R2 (attachment). Avantages: moins de charge backend,
   *    pas de transit binaire par notre serveur, débit direct R2->client. Inconvénient: expose URL temporaire
   *    (mais courte durée 5min, et permissions déjà vérifiées côté backend avant redirection).
   *  - Fallback stream: si STORAGE_DRIVER=local ou si ?stream=1 ou si génération signed URL échoue,
   *    on stream via backend (contrôle total, mais charge CPU/bande passante sur notre serveur).
   */
  @Public()
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const user = (req as unknown as AuthenticatedRequest).user;
    const resource = await this.resources.findOne(id);
    if (!this.isVisible(resource, user)) return res.status(404).json({ message: 'Ressource non trouvée' });

    const key = resource.filePath || resource.fileName;
    if (!key) return res.status(404).json({ message: 'Fichier introuvable' });

    // Vérifie existence (évite de signer une key inexistante)
    try {
      const exists = await this.storage.fileExists(key);
      if (!exists) return res.status(404).json({ message: 'Fichier introuvable' });
    } catch (e) {
      this.logger.error(`fileExists échoué key=${key}: ${(e as Error).message}`);
      return res.status(500).json({ message: 'Erreur interne' });
    }

    // Compteur sans bloquer : dédupliqué (ip + ressource, 10 min), hors requêtes Range.
    void this.resources.countDownloadOnce(resource.id, req.ip, Boolean(req.headers.range));

    // Par défaut on STREAM via backend (même origine, CORS OK, compatible fetch->blob).
    // Redirection 302 vers URL signée uniquement si ?signed=1 ou ?redirect=1 est demandé explicitement.
    // Compromis : stream = contrôle total + pas de config CORS R2 nécessaire, mais charge backend ;
    // signed URL = 0 charge backend mais nécessite CORS R2 + expose URL temporaire.
    const useSigned = (req.query as any)?.signed === '1' || (req.query as any)?.redirect === '1';
    // Nom exposé : slug + extension réelle (jamais le nom interne brut).
    const downloadExt = (resource.fileName?.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
    const downloadName = `${resource.slug}.${downloadExt}`;

    if (useSigned) {
      try {
        const url = await this.storage.getSignedUrlWithDisposition(key, 300, 'attachment', downloadName);
        return res.redirect(302, url);
      } catch (e) {
        this.logger.error(`getSignedUrl download échoué key=${key}, fallback stream: ${(e as Error).message}`);
        // fallback stream ci-dessous
      }
    }

    // Stream via backend — par défaut (compatible avec fetch blob du frontend)
    try {
      const stream = await this.storage.getDownloadStream(key);
      // Si le client coupe, détruire le flux R2 (pas de fuite).
      res.on('close', () => stream.destroy());
      res.set({
        'Content-Type': resource.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${safeDownloadFilename(downloadName)}`,
        'X-Content-Type-Options': 'nosniff',
      });
      stream.on('error', (err) => {
        this.logger.error(`Stream download error key=${key}: ${err.message}`);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur interne' });
        else res.end();
      });
      stream.pipe(res);
    } catch (e) {
      this.logger.error(`getDownloadStream échoué key=${key}: ${(e as Error).message}`);
      if (!res.headersSent) return res.status(500).json({ message: 'Erreur interne' });
    }
  }

  /**
   * GET /resources/:id/preview (inline)
   * Par défaut STREAM (même origine). Redirection signée seulement si ?signed=1 / ?redirect=1.
   */
  @Public()
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  @Get(':id/preview')
  async preview(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const user = (req as unknown as AuthenticatedRequest).user;
    const resource = await this.resources.findOne(id);
    if (!this.isVisible(resource, user)) return res.status(404).json({ message: 'Ressource non trouvée' });

    const key = resource.filePath || resource.fileName;
    if (!key) return res.status(404).json({ message: 'Fichier introuvable' });

    try {
      const exists = await this.storage.fileExists(key);
      if (!exists) return res.status(404).json({ message: 'Fichier introuvable' });
    } catch (e) {
      this.logger.error(`fileExists preview échoué key=${key}: ${(e as Error).message}`);
      return res.status(500).json({ message: 'Erreur interne' });
    }

    const useSigned = (req.query as any)?.signed === '1' || (req.query as any)?.redirect === '1';
    const downloadExt = (resource.fileName?.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
    const downloadName = `${resource.slug}.${downloadExt}`;

    if (useSigned) {
      try {
        const url = await this.storage.getSignedUrlWithDisposition(key, 300, 'inline', downloadName);
        return res.redirect(302, url);
      } catch (e) {
        this.logger.error(`getSignedUrl preview échoué key=${key}, fallback stream: ${(e as Error).message}`);
      }
    }

    try {
      const stream = await this.storage.getDownloadStream(key);
      const mime = resource.mimeType || 'application/octet-stream';
      res.set({
        'Content-Type': mime,
        'Content-Disposition': `inline; filename*=UTF-8''${safeDownloadFilename(downloadName)}`,
        'X-Content-Type-Options': 'nosniff',
        // PDF/image inline sandboxé : limite l'exécution JS embarqué côté viewer
        'Content-Security-Policy': 'sandbox',
      });
      res.on('close', () => stream.destroy());
      stream.on('error', (err) => {
        this.logger.error(`Stream preview error key=${key}: ${err.message}`);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur interne' });
        else res.end();
      });
      stream.pipe(res);
    } catch (e) {
      this.logger.error(`getDownloadStream preview échoué key=${key}: ${(e as Error).message}`);
      if (!res.headersSent) return res.status(500).json({ message: 'Erreur interne' });
    }
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  create(
    @Body() dto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Fichier requis (PDF, PNG, JPEG, WEBP — 10 Mo max)');
    return this.resources.create(dto, file, user?.id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.resources.approve(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.resources.reject(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto, @CurrentUser() user: AuthUser) {
    return this.resources.update(id, dto, user);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.resources.remove(id, user);
  }
}
