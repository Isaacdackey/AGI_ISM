import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.jwt,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }
  async validate(payload: { sub: string; tv: number; iat: number; exp: number; at?: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isActive === false) return null;
    // Révocation : tv du token doit correspondre à la version en DB (logout / changement mdp / rôle)
    if (typeof payload.tv !== 'number' || payload.tv !== user.tokenVersion) return null;
    const { password: _password, ...result } = user;
    // Session exposée à req.user uniquement (les réponses la retirent via AuthService.sanitize).
    return { ...result, session: { iat: payload.iat, exp: payload.exp, at: payload.at } };
  }
}
