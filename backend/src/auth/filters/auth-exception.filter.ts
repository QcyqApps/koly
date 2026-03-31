import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * This filter converts BadRequestException to UnauthorizedException (401)
 * for auth endpoints. This ensures that even validation errors on login/register
 * return 401 instead of 400, preventing information leakage about field validation.
 */
@Catch(BadRequestException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Convert to 401 Unauthorized
    response.status(HttpStatus.UNAUTHORIZED).json({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Nieprawidłowe dane logowania',
      error: 'Unauthorized',
    });
  }
}
