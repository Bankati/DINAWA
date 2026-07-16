import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PropertyDocumentType } from '@prisma/client';

// Un appel = un type — voir /architect unité 13. Plusieurs fichiers du même
// type sont acceptés en un seul appel ; un type différent nécessite un
// second appel.
export class UploadPropertyDocumentDto {
  @ApiProperty({ enum: PropertyDocumentType })
  @IsEnum(PropertyDocumentType)
  type!: PropertyDocumentType;
}
