/**
 * Table centralisée unique source de vérité pour les types de fichiers autorisés.
 * Toute validation (fileFilter, verifyMagicBytes, extension whitelist, key validation)
 * doit importer depuis ici — pas de duplication.
 */

export type FileTypeEntry = {
  ext: string; // sans point, ex: 'pdf'
  mime: string; // canonique
  aliases?: string[]; // mimes alias acceptés, ex: image/jpg pour image/jpeg
  extAliases?: string[]; // extensions alias acceptées, ex: .jpeg pour .jpg
  magic?: number[]; // octets magiques au début du fichier (offset 0)
  check?: (buf: Buffer) => boolean; // vérif custom (ex: WEBP RIFF....WEBP)
};

export const FILE_TYPES: Record<string, FileTypeEntry> = {
  'application/pdf': {
    ext: 'pdf',
    mime: 'application/pdf',
    magic: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  'image/png': {
    ext: 'png',
    mime: 'image/png',
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // 8 bytes PNG
  },
  'image/jpeg': {
    ext: 'jpg',
    mime: 'image/jpeg',
    aliases: ['image/jpg'],
    extAliases: ['jpeg'],
    magic: [0xff, 0xd8, 0xff], // SOI + JFIF marker start; suffit pour anti-spoof
  },
  'image/webp': {
    ext: 'webp',
    mime: 'image/webp',
    // RIFF xxxx WEBP : 0-3 RIFF, 8-11 WEBP
    check: (buf: Buffer) =>
      buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP',
  },
};

// Alias mime -> canonique (ex: image/jpg -> image/jpeg)
const MIME_ALIAS_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [canon, entry] of Object.entries(FILE_TYPES)) {
    m[canon.toLowerCase()] = canon;
    if (entry.aliases) {
      for (const a of entry.aliases) m[a.toLowerCase()] = canon;
    }
  }
  return m;
})();

export function normalizeMime(mime: string): string | undefined {
  if (!mime) return undefined;
  return MIME_ALIAS_MAP[mime.toLowerCase()];
}

export function getFileType(mime: string): FileTypeEntry | undefined {
  const n = normalizeMime(mime);
  return n ? FILE_TYPES[n] : undefined;
}

export function getExtensionForMime(mime: string): string | undefined {
  const ft = getFileType(mime);
  return ft?.ext;
}

export function isAllowedMime(mime: string): boolean {
  return !!getFileType(mime);
}

export const ALLOWED_EXTS: string[] = (() => {
  const set = new Set<string>();
  for (const e of Object.values(FILE_TYPES)) {
    set.add('.' + e.ext);
    if (e.extAliases) for (const a of e.extAliases) set.add('.' + a.replace(/^\./, ''));
  }
  return [...set];
})();

export function isAllowedExt(ext: string): boolean {
  if (!ext) return false;
  return ALLOWED_EXTS.includes(ext.toLowerCase());
}

export function getAllowedExtsForMime(mime: string): string[] {
  const ft = getFileType(mime);
  if (!ft) return [];
  const exts = ['.' + ft.ext];
  if (ft.extAliases) exts.push(...ft.extAliases.map((a) => '.' + a.replace(/^\./, '')));
  return exts;
}

/**
 * Vérifie que le buffer correspond bien au mimetype déclaré (anti-spoofing).
 * Retourne true si match, false sinon.
 */
export function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const ft = getFileType(mime);
  if (!ft) return false;
  if (ft.check) return ft.check(buffer);
  if (ft.magic) {
    if (buffer.length < ft.magic.length) return false;
    for (let i = 0; i < ft.magic.length; i++) {
      if (buffer[i] !== ft.magic[i]) return false;
    }
    return true;
  }
  return false;
}
