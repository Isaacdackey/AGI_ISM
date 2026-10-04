import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginAttemptsService } from './login-attempts.service';
import { BCRYPT_COST } from '../common/utils/bcrypt-cost';
import { Role } from '@prisma/client';

type SessionUser = { id: string; email: string; role: Role; tokenVersion: number };

@Injectable()
export class AuthService {
  // Hash factice calculé au même coût que les vrais (anti-énumération temporelle).
  private readonly DUMMY_HASH = bcrypt.hashSync('dummy-password-never-used', BCRYPT_COST);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private attempts: LoginAttemptsService,
  ) {}

  private sign(user: SessionUser, authTime?: number) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
      at: authTime ?? Math.floor(Date.now() / 1000),
    });
  }

  /** Retire les champs sensibles/transport des réponses (jamais password ni session). */
  private sanitize<T extends { password?: unknown; session?: unknown }>(user: T): Omit<T, 'password' | 'session'> {
    const { password: _password, session: _session, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    const email = this.attempts.normalize(dto.email);
    if (this.attempts.isLocked(email)) {
      throw new HttpException('Trop de tentatives, réessayez plus tard', HttpStatus.TOO_MANY_REQUESTS);
    }
    // Message unique dans tous les cas (anti-énumération : existence, rôle, mot de passe, activité).
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.password ?? this.DUMMY_HASH;
    const valid = await bcrypt.compare(dto.password, hash);
    if (user === null || !valid || user.role === Role.STUDENT || user.isActive === false) {
      const justLocked = this.attempts.recordFailure(email);
      if (justLocked || this.attempts.isLocked(email)) {
        throw new HttpException('Trop de tentatives, réessayez plus tard', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new UnauthorizedException('Identifiants invalides');
    }
    this.attempts.recordSuccess(email);
    const token = this.sign(user);
    return { user: this.sanitize(user), access_token: token };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isActive === false) throw new UnauthorizedException('Identifiants invalides');
    const currentValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!currentValid) throw new UnauthorizedException('Mot de passe actuel incorrect');
    if (dto.newPassword === dto.currentPassword) {
      throw new HttpException('Le nouveau mot de passe doit être différent de l\u2019ancien', HttpStatus.BAD_REQUEST);
    }
    const localPart = user.email.split('@')[0]?.toLowerCase();
    if (localPart && localPart.length >= 3 && dto.newPassword.toLowerCase().includes(localPart)) {
      throw new HttpException('Le mot de passe ne doit pas contenir votre identifiant', HttpStatus.BAD_REQUEST);
    }
    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    // Nouvelle session : les anciens tokens sont révoqués (tv++), on ré-émet le cookie.
    const token = this.sign(updated);
    return { user: this.sanitize(updated), access_token: token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  // Révocation : incrémente tokenVersion => tous les JWT précédents (tv différent) sont rejetés.
  // Déconnecte tous les appareils (documenté).
  async logout(userId: string) {
    if (!userId) return;
    await this.prisma.user
      .update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })
      .catch((): null => null);
  }
}
