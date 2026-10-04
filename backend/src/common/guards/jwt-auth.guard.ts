import { Injectable, ExecutionContext, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Try to authenticate if token present, but don't block public access
      try {
        await super.canActivate(context);
      } catch {}
      // If auth succeeded, req.user will be set; if not, keep public access
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }
  // Signatures `any` explicites imposées par l'interface générique IAuthGuard (passport).
  // Le `user` est affiné en AuthUser par JwtStrategy.validate.
  handleRequest(err: any, user: any, info: any, context: ExecutionContext): any {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return user || null;
    if (err || !user) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException();
    }
    return user;
  }
}
