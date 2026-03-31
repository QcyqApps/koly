import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import type { User } from '@prisma/client';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    // Access token: short-lived (15 minutes)
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Refresh token: long-lived (7 days)
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS);
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
  }

  @Public()
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Rejestracja udana' };
  }

  @Public()
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @UseFilters(AuthExceptionFilter)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Zalogowano pomyślnie' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);
    this.clearAuthCookies(res);
    return { message: 'Wylogowano pomyślnie' };
  }

  @Public()
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(user.id, user.email);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Token odświeżony' };
  }

  @Get('me')
  async me(@CurrentUser() user: User) {
    const { passwordHash, refreshToken, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('demo')
  @HttpCode(HttpStatus.OK)
  async loginDemo(@Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.loginDemo();
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Demo login successful' };
  }
}
