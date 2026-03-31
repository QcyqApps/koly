import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'nails',
    'hair',
    'cosmetics',
    'physio',
    'trainer',
    'photo',
    'tattoo',
    'other',
  ])
  industry?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ryczalt', 'skala', 'liniowy'])
  taxForm?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  zusMonthly?: number;

  @IsOptional()
  @IsNumber()
  monthlyGoal?: number | null;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
