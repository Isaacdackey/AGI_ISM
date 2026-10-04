import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF : pour les requêtes mutatives authentifiées par cookie,
 * exige une Origin/Referer dont l'origine correspond EXACTEMENT
 * à une origine de FRONTEND_URL (comparaison d'origines, pas de préfixe).
 * Les appels Bearer purs (API) ne sont pas concernés.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
    // Login public : pas de session préexistante => pas de CSRF de session (rate-limit s'en charge)
    if (isPublic && req.path === '/api/auth/login') return true;

    const hasCookie = Boolean(req.cookies?.jwt);
    const hasBearer =
      typeof req.headers?.authorization === 'string' && req.headers.authorization.startsWith('Bearer ');
    if (!hasCookie || hasBearer) return true;

    const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((s) => toOrigin(s.trim()))
      .filter((o): o is string => o !== null);
    const candidate = toOrigin(req.headers?.origin) ?? toOrigin(req.headers?.referer);
    if (!candidate) throw new ForbiddenException('Origine requise');
    if (!allowed.includes(candidate)) throw new ForbiddenException('Origine non autorisée');
    return true;
  }
}
