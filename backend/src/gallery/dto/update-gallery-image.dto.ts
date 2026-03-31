import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateGalleryImageDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPortfolio?: boolean;
}
