import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyStatus, PropertyType } from '@prisma/client';

// Champs scalaires de `Property` — jamais les relations (photos, documents,
// mandates...), qui ne sont pas chargées par `include: { property: true }`.
export class PropertySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ enum: PropertyType })
  type!: PropertyType;

  @ApiProperty({ enum: PropertyStatus })
  status!: PropertyStatus;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  neighborhood!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  surfaceArea!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  roomsCount!: number | null;

  @ApiProperty()
  monthlyRent!: number;

  @ApiProperty()
  monthlyCharges!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
