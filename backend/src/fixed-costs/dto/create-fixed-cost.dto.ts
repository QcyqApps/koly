import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateFixedCostDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
