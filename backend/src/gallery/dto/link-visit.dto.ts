import { IsUUID } from 'class-validator';

export class LinkVisitDto {
  @IsUUID()
  visitId: string;
}
