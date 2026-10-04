import { Controller, Post, Body, Get, Res, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Response, Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private setAuthCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const m = /^(\d+)([smhd])$/.exec(expiresIn.trim());
    let maxAge = 15 * 60 * 1000;
    if (m) {
      const n = Number(m[1]);
      const mult: Record<string, number> = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 24 * 3600 * 1000 };
      maxAge = Math.min(n * mult[m[2]], 3600 * 1000);
    }
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge,
      path: '/',
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setAuthCookie(res, result.access_token);
    return { user: result.user };
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.changePassword(user.id, dto);
    this.setAuthCookie(res, result.access_token);
    return { user: result.user };
  }

  @Post('logout')
  @Public()
  async logout(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    // Ne jamais échouer : sans token valide on efface simplement le cookie.
    const user = (req as unknown as { user?: { id: string } })?.user;
    if (user?.id) await this.auth.logout(user.id);
    res.clearCookie('jwt', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    return { message: 'Déconnecté' };
  }

  // Public volontairement : 200 toujours ({ user } ou { user: null }),
  // pour ne pas polluer la console des visiteurs anonymes avec des 401.
  @Public()
  @Get('me')
  async me(@Req() req: Request) {
    const user = (req as unknown as { user?: { id: string } })?.user;
    if (!user?.id) return { user: null };
    return { user: await this.auth.me(user.id) };
  }
}
