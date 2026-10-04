import { Readable } from 'stream';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * Contrat stable pour tout backend de stockage.
 * Aucune fuite S3/R2 vers les callers (controller/service).
 */
export interface StorageProvider {
  /**
   * Upload un buffer vers le stockage.
   * @param buffer contenu fichier
   * @param key chemin logique (ex: resources/<uuid>.pdf) — généré côté serveur, jamais depuis le nom original
   * @param mimeType ex: application/pdf
   * @returns la key stockée (identique à l'input si succès)
   */
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Retourne un stream en lecture pour la key donnée.
   * Le caller pipe ce stream vers la réponse HTTP.
   */
  getDownloadStream(key: string): Promise<Readable>;

  /**
   * Génère une URL signée temporaire pour preview/download sans transiter par notre backend.
   * @param expiresInSeconds durée de validité (ex: 300 = 5min)
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Supprime le fichier. Idempotent (ne throw pas si absent, sauf erreur infra).
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Vérifie l'existence du fichier.
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Génère un nom de fichier sécurisé côté serveur (uuid + extension).
   * Extension déterminée à partir du mimetype validé, jamais du nom original.
   * @param extension sans point, ex: 'pdf' | 'png' | 'jpg' | 'webp'
   */
  getSafeFilename(extension?: string): string;

  /**
   * Optionnel: retourne la taille / mime ? Non nécessaire pour l'interface minimale.
   */
}
