import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateGalleryImageDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  visitId?: string;

  @IsBoolean()
  @IsOptional()
  isPortfolio?: boolean;
}
