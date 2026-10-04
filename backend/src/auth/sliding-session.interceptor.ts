import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

const RENEW_WITHIN_S = 5 * 60;
const DEFAULT_SESSION_MAX_HOURS = 8;

/**
 * Session glissante : si le token expire dans moins de 5 min et que la
 * session (claim `at`) est plus jeune que SESSION_MAX_HOURS (défaut 8),
 * ré-émet un JWT (même `tv`, même `at`) et rafraîchit le cookie.
 * Au-delà de la durée absolue : pas de renouvellement (reconnexion requise).
 */
@Injectable()
export class SlidingSessionInterceptor implements NestInterceptor {
  constructor(private jwt: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const user = req?.user;
    const session = user?.session;
    if (user && session && typeof session.exp === 'number' && typeof session.at === 'number') {
      const now = Math.floor(Date.now() / 1000);
      const maxHours = Number(process.env.SESSION_MAX_HOURS || String(DEFAULT_SESSION_MAX_HOURS));
      const maxSeconds = Number.isNaN(maxHours) ? DEFAULT_SESSION_MAX_HOURS * 3600 : maxHours * 3600;
      if (session.exp - now < RENEW_WITHIN_S && now - session.at < maxSeconds) {
        const token = this.jwt.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
          tv: user.tokenVersion,
          at: session.at,
        });
        const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const m = /^(\d+)([smhd])$/.exec(expiresIn.trim());
        let maxAge = 15 * 60 * 1000;
        if (m) {
          const mult: Record<string, number> = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 24 * 3600 * 1000 };
          maxAge = Math.min(Number(m[1]) * mult[m[2]], 3600 * 1000);
        }
        res.cookie('jwt', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge,
          path: '/',
        });
      }
    }
    return next.handle();
  }
}
