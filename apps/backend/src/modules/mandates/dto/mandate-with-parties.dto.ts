import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MandateFeeType, MandateStatus } from '@prisma/client';
import { MandatePartyDto } from './mandate-party.dto';
import { PropertySummaryDto } from './property-summary.dto';

// DTO de réponse pour GET /mandates (MandatesService.findAllForUser) — voir
// /remember, recommandation "types partagés backend↔frontend" : ce fichier
// est le premier endpoint migré vers un vrai schéma de réponse documenté
// (jusqu'ici, aucun endpoint du backend n'en avait). Générer les types
// frontend depuis ce schéma (`npm run types:sync` à la racine) plutôt que de
// dupliquer une interface TS à la main dans chaque page — c'est justement
// cette duplication qui a causé les bugs `owner`/`manager` absents trouvés
// le 2026-08-09.
export class MandateWithPartiesDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  managerId!: string;

  @ApiProperty({ enum: MandateStatus })
  status!: MandateStatus;

  @ApiProperty({ enum: MandateFeeType })
  feeType!: MandateFeeType;

  @ApiProperty()
  feeValue!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endDate!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  revokedReason!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: PropertySummaryDto })
  property!: PropertySummaryDto;

  @ApiProperty({ type: MandatePartyDto })
  owner!: MandatePartyDto;

  @ApiProperty({ type: MandatePartyDto })
  manager!: MandatePartyDto;
}
