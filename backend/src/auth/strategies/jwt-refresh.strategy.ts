import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../dto';

// Extract refresh token from cookie or Authorization header
const extractRefreshTokenFromCookieOrHeader = (req: Request): string | null => {
  // First try to get from cookie
  if (req.cookies && req.cookies.refresh_token) {
    return req.cookies.refresh_token;
  }
  // Fallback to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: extractRefreshTokenFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || '',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = extractRefreshTokenFromCookieOrHeader(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Brak tokenu odświeżania');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Nieprawidłowy token odświeżania');
    }

    return user;
  }
}
