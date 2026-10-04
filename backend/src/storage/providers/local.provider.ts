import { Injectable, Logger, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs';
import { StorageProvider } from '../storage.interface';
import { ALLOWED_EXTS } from '../../resources/file-types.config';

/**
 * Provider local disque — UNIQUEMENT pour dev/test/CI.
 * Interdit en production (vérifié dans r2.config.ts).
 * Implémente la même interface que R2Provider pour permettre le switch via STORAGE_DRIVER.
 */
@Injectable()
export class LocalProvider implements StorageProvider {
  private readonly logger = new Logger(LocalProvider.name);
  private readonly uploadDir: string;

  constructor() {
    const configured = process.env.UPLOAD_DIR || './uploads/resources';
    let dir = configured;
    if (!path.isAbsolute(dir)) {
      let base = process.cwd();
      const isBackendCwd = fs.existsSync(path.join(base, 'src', 'main.ts')) || base.endsWith('backend');
      if (!isBackendCwd && fs.existsSync(path.join(base, 'backend', 'package.json'))) {
        base = path.join(base, 'backend');
      }
      dir = path.resolve(base, dir);
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.uploadDir = path.resolve(dir);
    this.logger.warn(`LocalProvider actif — dir=${this.uploadDir} (dev/test uniquement)`);
  }

  private assertSafeKey(key: string): string {
    if (!key) throw new ForbiddenException('Nom de fichier invalide');
    // Si key contient un dossier (resources/...), on autorise mais on vérifie chaque segment
    if (key.includes('..') || key.includes('\\')) throw new ForbiddenException('Nom de fichier invalide');
    const segments = key.split('/');
    for (const seg of segments) {
      if (!seg || seg === '..' || seg.includes('\\')) throw new ForbiddenException('Nom de fichier invalide');
      if (seg !== path.basename(seg)) throw new ForbiddenException('Nom de fichier invalide');
    }
    const resolved = path.resolve(this.uploadDir, key);
    // Si key est du type resources/xxx.pdf et uploadDir est .../uploads/resources, on doit gérer
    // On normalise: si uploadDir finit par /resources et key commence par resources/, on évite duplication
    // Simplification: on résout toujours depuis uploadDir
    if (!resolved.startsWith(this.uploadDir)) throw new ForbiddenException('Chemin non autorisé');
    return resolved;
  }

  getSafeFilename(extension?: string): string {
    const { randomUUID } = require('crypto');
    const ext = (extension || 'pdf').toLowerCase().replace(/^\./, '');
    if (!ALLOWED_EXTS.includes('.' + ext)) {
      throw new InternalServerErrorException('Extension non autorisée');
    }
    return `${randomUUID()}.${ext}`;
  }

  async uploadFile(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const full = this.assertSafeKey(key);
    // Vérifie extension autorisée via table centralisée
    const ext = '.' + (key.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new InternalServerErrorException('Extension non autorisée');
    }
    try {
      await fs.promises.mkdir(path.dirname(full), { recursive: true });
      await fs.promises.writeFile(full, buffer);
      this.logger.log(`Local upload OK — key=${key} size=${buffer.length}`);
      return key;
    } catch (err: any) {
      this.logger.error(`Local upload échoué key=${key}: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException('Erreur lors de l\'upload du fichier');
    }
  }

  async getDownloadStream(key: string): Promise<Readable> {
    const full = this.assertSafeKey(key);
    try {
      if (!fs.existsSync(full)) throw new InternalServerErrorException('Fichier introuvable');
      return fs.createReadStream(full);
    } catch (err: any) {
      this.logger.error(`Local getDownloadStream échoué key=${key}: ${err?.message}`);
      throw new InternalServerErrorException('Erreur lors de la lecture du fichier');
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    // En local, pas de signed URL réelle — on retourne une URL locale fictive
    // Le controller devra privilégier le streaming en mode local
    // On throw pour forcer le fallback stream, ou on retourne un path
    this.logger.warn(`Local getSignedUrl appelé pour key=${key} — pas de signed URL en local, fallback stream attendu`);
    throw new InternalServerErrorException('Signed URL non disponible en mode local');
  }

  async deleteFile(key: string): Promise<void> {
    const full = this.assertSafeKey(key);
    try {
      if (fs.existsSync(full)) await fs.promises.unlink(full);
      this.logger.log(`Local delete OK — key=${key}`);
    } catch (err: any) {
      this.logger.error(`Local delete échoué key=${key}: ${err?.message}`);
      throw new InternalServerErrorException('Erreur lors de la suppression du fichier');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const full = this.assertSafeKey(key);
      return fs.existsSync(full);
    } catch {
      return false;
    }
  }
}
