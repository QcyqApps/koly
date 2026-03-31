import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdateFixedCostDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
