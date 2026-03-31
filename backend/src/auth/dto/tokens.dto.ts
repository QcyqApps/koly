export class TokensDto {
  accessToken: string;
  refreshToken: string;
}

export class JwtPayload {
  sub: string;
  email: string;
}
