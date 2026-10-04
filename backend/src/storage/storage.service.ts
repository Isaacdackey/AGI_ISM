import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'stream';
import { STORAGE_PROVIDER, StorageProvider } from './storage.interface';

/**
 * Façade stable — les controllers/services n'importent QUE ce service.
 * Aucune fuite de détails S3/R2 vers l'extérieur.
 * Toute la logique S3 est encapsulée dans le provider injecté (R2 ou Local).
 *
 * Interface exposée:
 *  - uploadFile(buffer, key, mimeType): Promise<string>
 *  - getDownloadStream(key): Promise<Readable>
 *  - getSignedUrl(key, expiresInSeconds): Promise<string>
 *  - deleteFile(key): Promise<void>
 *  - fileExists(key): Promise<boolean>
 *  - getSafeFilename(): string
 *  - getSignedUrlWithDisposition(...): helper pour inline/attachment
 */
@Injectable()
export class StorageService implements StorageProvider {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  getSafeFilename(extension?: string): string {
    return this.provider.getSafeFilename(extension);
  }

  /**
   * Génère une key R2 sécurisée: resources/<uuid>.<ext>
   * Extension déterminée à partir du mimetype validé, jamais du nom original.
   * @param extension sans point, ex: 'pdf' | 'png' | 'jpg' | 'webp'
   */
  generateResourceKey(extension?: string): string {
    const filename = this.getSafeFilename(extension);
    return `resources/${filename}`;
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    return this.provider.uploadFile(buffer, key, mimeType);
  }

  async getDownloadStream(key: string): Promise<Readable> {
    return this.provider.getDownloadStream(key);
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    return this.provider.getSignedUrl(key, expiresInSeconds);
  }

  /**
   * Helper pour générer une URL signée avec Content-Disposition inline/attachment.
   * Si le provider est R2, délègue à R2Provider.getSignedUrlWithDisposition.
   * Sinon fallback sur getSignedUrl simple.
   */
  async getSignedUrlWithDisposition(
    key: string,
    expiresInSeconds: number,
    disposition: 'inline' | 'attachment',
    filename?: string,
  ): Promise<string> {
    const anyProvider: any = this.provider;
    if (typeof anyProvider.getSignedUrlWithDisposition === 'function') {
      return anyProvider.getSignedUrlWithDisposition(key, expiresInSeconds, disposition, filename);
    }
    return this.provider.getSignedUrl(key, expiresInSeconds);
  }

  async deleteFile(key: string): Promise<void> {
    return this.provider.deleteFile(key);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.provider.fileExists(key);
  }
}
