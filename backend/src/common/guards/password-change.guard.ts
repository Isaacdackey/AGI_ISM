import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Routes utilisables sans avoir changé son mot de passe temporaire.
const EXEMPT_PATHS = new Set(['/api/auth/me', '/api/auth/logout', '/api/auth/change-password']);

/**
 * Impose le changement de mot de passe temporaire (modérateurs créés
 * par l'admin) avant tout accès aux routes protégées.
 * Enregistré APRÈS JwtAuthGuard et RolesGuard (AuthModule).
 */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // JwtAuthGuard/RolesGuard gèrent le cas non authentifié.
    if (!user.mustChangePassword) return true;
    if (EXEMPT_PATHS.has(req.path)) return true;
    throw new ForbiddenException({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Changement de mot de passe requis',
    });
  }
}
