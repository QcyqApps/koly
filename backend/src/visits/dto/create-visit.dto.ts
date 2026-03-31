import { IsUUID, IsDateString, IsOptional, IsNumber, IsIn, IsString } from 'class-validator';

export class CreateVisitDto {
  @IsUUID()
  serviceId: string;

  @IsDateString()
  visitDate: string;

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
