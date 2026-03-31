import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsUUID } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  materialCost?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
