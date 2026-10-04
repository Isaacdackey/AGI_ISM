import { Injectable } from '@nestjs/common';

type Attempt = { count: number; firstAt: number; lockedUntil: number };

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const CLEANUP_MS = 5 * 60 * 1000;

/**
 * Anti-bruteforce par compte (mémoire, mono-instance).
 * 5 échecs en 15 min ⇒ verrouillage 15 min, y compris pour les emails
 * inconnus (même comportement, pas d'oracle). Succès ⇒ reset.
 * Le @Throttle par IP reste actif en complément (défense en profondeur).
 * Si plusieurs instances : passer sur Redis.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, Attempt>();

  constructor() {
    const timer = setInterval(() => this.cleanup(), CLEANUP_MS);
    // Ne pas retenir le processus en vie pour ce seul nettoyage.
    if (typeof timer.unref === 'function') timer.unref();
  }

  normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  isLocked(email: string): boolean {
    const key = this.normalize(email);
    const entry = this.attempts.get(key);
    if (!entry) return false;
    const now = Date.now();
    if (entry.lockedUntil > now) return true;
    if (now - entry.firstAt > WINDOW_MS) this.attempts.delete(key);
    return false;
  }

  /** Enregistre un échec. Renvoie true si le compte vient d'être verrouillé. */
  recordFailure(email: string): boolean {
    const key = this.normalize(email);
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
      this.attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
      return false;
    }
    entry.count += 1;
    if (entry.count >= MAX_FAILURES) {
      entry.lockedUntil = now + LOCK_MS;
      return true;
    }
    return false;
  }

  recordSuccess(email: string): void {
    this.attempts.delete(this.normalize(email));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      if (entry.lockedUntil <= now && now - entry.firstAt > WINDOW_MS) {
        this.attempts.delete(key);
      }
    }
  }
}
