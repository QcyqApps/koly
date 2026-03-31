import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator';

export class UpdateVisitDto {
  @IsOptional()
  @IsIn(['completed', 'no_show', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsNumber()
  actualPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
