import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { getR2Config } from '../../config/r2.config';
import { StorageProvider } from '../storage.interface';
import { ALLOWED_EXTS } from '../../resources/file-types.config';

@Injectable()
export class R2Provider implements StorageProvider {
  private readonly logger = new Logger(R2Provider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const cfg = getR2Config();
    this.bucket = cfg.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      // R2 recommande forcePathStyle false (virtual-hosted)
      forcePathStyle: false,
    });
    this.logger.log(`R2Provider initialized — bucket=${this.bucket} endpoint=${cfg.endpoint}`);
  }

  /**
   * Validation anti-traversal pour toute key.
   * - pas de .., pas de //, pas de \ , pas de chemin absolu
   * - segments autorisés: alphanum + . _ - /
   */
  private assertSafeKey(key: string): void {
    if (!key || typeof key !== 'string') throw new InternalServerErrorException('Clé de stockage invalide');
    if (key.includes('..') || key.includes('\\') || key.startsWith('/') || key.includes('//')) {
      throw new InternalServerErrorException('Clé de stockage invalide');
    }
    // Basename du dernier segment ne doit pas être vide et ne doit pas contenir de chars dangereux
    const segments = key.split('/');
    for (const seg of segments) {
      if (!seg || seg === '.' || seg === '..') throw new InternalServerErrorException('Clé de stockage invalide');
    }
    // Optionnel: whitelist chars (évite injection)
    if (!/^[a-zA-Z0-9._\-\/]+$/.test(key)) {
      throw new InternalServerErrorException('Clé de stockage invalide');
    }
  }

  getSafeFilename(extension?: string): string {
    const { randomUUID } = require('crypto');
    const ext = (extension || 'pdf').toLowerCase().replace(/^\./, '');
    // whitelist via table centralisée
    if (!ALLOWED_EXTS.includes('.' + ext)) {
      throw new InternalServerErrorException('Extension non autorisée');
    }
    return `${randomUUID()}.${ext}`;
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    this.assertSafeKey(key);
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new InternalServerErrorException('Buffer invalide');
    }
    // Vérifie que l'extension de la clé fait partie des extensions autorisées (via table centralisée)
    const ext = '.' + (key.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new InternalServerErrorException('Extension non autorisée');
    }

    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
        ContentLength: buffer.length,
      });

      // Timeout simple via Promise.race (évite hang indéfini si R2 injoignable)
      await this.withTimeout(this.client.send(cmd), 15000, 'uploadFile');
      this.logger.log(`R2 upload OK — key=${key} size=${buffer.length}`);
      return key;
    } catch (err: any) {
      this.handleR2Error(err, 'uploadFile', { key });
      throw new InternalServerErrorException('Erreur lors de l\'upload du fichier');
    }
  }

  async getDownloadStream(key: string): Promise<Readable> {
    this.assertSafeKey(key);
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const res = await this.withTimeout(this.client.send(cmd), 15000, 'getDownloadStream');
      if (!res.Body) {
        this.logger.error(`R2 getDownloadStream: Body vide pour key=${key}`);
        throw new InternalServerErrorException('Fichier introuvable');
      }
      // Body est un Readable (Node) dans Node.js
      return res.Body as Readable;
    } catch (err: any) {
      if (this.isNotFound(err)) {
        this.logger.warn(`R2 getDownloadStream: NotFound key=${key}`);
        throw new InternalServerErrorException('Fichier introuvable');
      }
      this.handleR2Error(err, 'getDownloadStream', { key });
      throw new InternalServerErrorException('Erreur lors de la lecture du fichier');
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    this.assertSafeKey(key);
    if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0 || expiresInSeconds > 7 * 24 * 3600) {
      expiresInSeconds = 3600; // fallback 1h, max 7j (limite S3)
    }
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const url = await getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
      return url;
    } catch (err: any) {
      this.handleR2Error(err, 'getSignedUrl', { key });
      throw new InternalServerErrorException('Erreur lors de la génération de l\'URL signée');
    }
  }

  /**
   * Variante avec Content-Disposition (inline vs attachment).
   * Méthode helper non exposée dans l'interface publique minimale, mais utile pour controller.
   */
  async getSignedUrlWithDisposition(
    key: string,
    expiresInSeconds: number,
    disposition: 'inline' | 'attachment',
    filename?: string,
  ): Promise<string> {
    this.assertSafeKey(key);
    try {
      const cmd = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: disposition === 'attachment'
          ? `attachment; filename="${(filename || key.split('/').pop() || 'document.pdf').replace(/"/g, '')}"`
          : `inline; filename="${(filename || key.split('/').pop() || 'document.pdf').replace(/"/g, '')}"`,
      });
      const url = await getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
      return url;
    } catch (err: any) {
      this.handleR2Error(err, 'getSignedUrlWithDisposition', { key });
      throw new InternalServerErrorException('Erreur lors de la génération de l\'URL signée');
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.assertSafeKey(key);
    try {
      const cmd = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
      await this.withTimeout(this.client.send(cmd), 10000, 'deleteFile');
      this.logger.log(`R2 delete OK — key=${key}`);
    } catch (err: any) {
      this.handleR2Error(err, 'deleteFile', { key });
      throw new InternalServerErrorException('Erreur lors de la suppression du fichier');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    this.assertSafeKey(key);
    try {
      const cmd = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
      await this.withTimeout(this.client.send(cmd), 8000, 'fileExists');
      return true;
    } catch (err: any) {
      if (this.isNotFound(err)) return false;
      // Pour les autres erreurs (credentials, bucket introuvable), on log et on propage générique
      // Mais fileExists est souvent utilisé en check non bloquant: on log et retourne false?
      // Choix: logger l'erreur et throw générique pour ne pas masquer un problème infra
      this.handleR2Error(err, 'fileExists', { key });
      throw new InternalServerErrorException('Erreur lors de la vérification du fichier');
    }
  }

  // ---- helpers ----

  private isNotFound(err: any): boolean {
    if (!err) return false;
    const name = err.name || err.Code || '';
    const status = err.$metadata?.httpStatusCode;
    return (
      name === 'NotFound' ||
      name === 'NoSuchKey' ||
      // NoSuchBucket volontairement exclu : bucket manquant ≠ clé absente.
      status === 404
    );
  }

  private handleR2Error(err: any, op: string, ctx: Record<string, any>) {
    const meta = err?.$metadata || {};
    const code = err?.name || err?.Code || 'Unknown';
    const status = meta.httpStatusCode || 'n/a';
    const requestId = meta.requestId || meta.extendedRequestId || 'n/a';

    // Mapping messages côté serveur (détaillé) vs client (générique)
    if (code === 'NoSuchBucket' || status === 404 && code.includes('Bucket')) {
      this.logger.error(`R2 ${op} — bucket introuvable (${this.bucket}) code=${code} status=${status} requestId=${requestId} ctx=${JSON.stringify(ctx)}`, err?.stack);
    } else if (code === 'InvalidAccessKeyId' || code === 'SignatureDoesNotMatch' || code === 'AccessDenied' || status === 403) {
      this.logger.error(`R2 ${op} — credentials invalides ou accès refusé code=${code} status=${status} requestId=${requestId} ctx=${JSON.stringify(ctx)}`, err?.stack);
    } else if (code === 'TimeoutError' || err?.name === 'TimeoutError' || code === 'RequestTimeout') {
      this.logger.error(`R2 ${op} — timeout code=${code} ctx=${JSON.stringify(ctx)}`, err?.stack);
    } else {
      this.logger.error(`R2 ${op} — erreur inattendue code=${code} status=${status} requestId=${requestId} ctx=${JSON.stringify(ctx)} message=${err?.message}`, err?.stack);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, op: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(Object.assign(new Error(`Timeout ${op} après ${ms}ms`), { name: 'TimeoutError' })), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId)) as Promise<T>;
  }
}
