import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseConfirmationStatus } from '@prisma/client';

// Formes de réponse documentées pour Swagger et les types frontend générés
// (contrat d'API du 09/11/2026). Le service renvoie exactement ces formes.

class ConfirmationPropertyDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty() neighborhood!: string;
  @ApiProperty() city!: string;
}

class InviterConfirmationLeaseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 50000 }) monthlyRent!: number;
  @ApiProperty() startDate!: Date;
  @ApiProperty({ type: ConfirmationPropertyDto }) property!: ConfirmationPropertyDto;
}

export class InviterLeaseConfirmationDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: LeaseConfirmationStatus }) status!: LeaseConfirmationStatus;
  @ApiProperty({
    enum: ['EMAIL', 'IN_APP', 'WHATSAPP'],
    isArray: true,
    description: 'EMAIL et IN_APP toujours ; WHATSAPP si Meta a accepté au moins un message de la demande',
  })
  channels!: ('EMAIL' | 'IN_APP' | 'WHATSAPP')[];
  @ApiProperty({ description: "Nom tapé par l'inviteur, jamais celui du compte", example: 'Awa Mensah' })
  tenantDisplayName!: string;
  @ApiProperty({ type: String, nullable: true }) phone!: string | null;
  @ApiProperty({ type: String, nullable: true }) email!: string | null;
  @ApiProperty({ type: InviterConfirmationLeaseDto }) lease!: InviterConfirmationLeaseDto;
  @ApiProperty() sentAt!: Date;
  @ApiProperty({ type: [Date] }) remindersSentAt!: Date[];
  @ApiProperty({ type: [Date], description: 'Les 2 rappels prévus (envoi + 2 jours, envoi + 5 jours)' })
  reminderSchedule!: Date[];
  @ApiProperty({ type: Date, nullable: true }) nextReminderAt!: Date | null;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) respondedAt!: Date | null;
  @ApiProperty({ example: 0 }) refusalCount!: number;
  @ApiProperty() canResend!: boolean;
}

class TenantConfirmationPropertyDto {
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty() neighborhood!: string;
  @ApiProperty() city!: string;
}

class TenantConfirmationLeaseDto {
  @ApiProperty({ example: 50000 }) monthlyRent!: number;
  @ApiProperty() startDate!: Date;
  @ApiProperty({ type: TenantConfirmationPropertyDto }) property!: TenantConfirmationPropertyDto;
}

export class TenantLeaseConfirmationDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Jean Dupont' }) inviterDisplayName!: string;
  @ApiProperty() sentAt!: Date;
  @ApiProperty({ type: TenantConfirmationLeaseDto }) lease!: TenantConfirmationLeaseDto;
  @ApiProperty() expiresAt!: Date;
}

export class AcceptLeaseConfirmationResponseDto {
  @ApiProperty({ enum: ['ACCEPTED'] }) status!: 'ACCEPTED';
  @ApiProperty() leaseId!: string;
}

export class RefuseLeaseConfirmationResponseDto {
  @ApiProperty({ enum: ['REFUSED'] }) status!: 'REFUSED';
}

export class CancelLeaseConfirmationResponseDto {
  @ApiProperty({ enum: ['CANCELLED'] }) status!: 'CANCELLED';
}

export class LeaseConfirmationErrorDto {
  @ApiProperty() statusCode!: number;
  @ApiProperty() error!: string;
  @ApiPropertyOptional({
    description:
      'ACTIVE_LEASE_EXISTS, CONFIRMATION_EXPIRED, CONFIRMATION_CLOSED, CONFIRMATION_NOT_PENDING, ' +
      'CONFIRMATION_NOT_RESENDABLE, CONFIRMATION_BLOCKED, PROPERTY_NOT_AVAILABLE',
  })
  code?: string;
  @ApiProperty() message!: string;
}
