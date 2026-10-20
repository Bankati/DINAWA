import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsappConsentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { normalizeTogoPhone } from '../../../common/utils/normalize-togo-phone';

// Numéro WhatsApp togolais : accepte « +228 90 33 05 57 », « 0022890330557 »
// ou « 90330557 », toujours ramené et stocké à 8 chiffres (jamais le format
// Meta, voir common/utils/phone.ts).
const WhatsappPhone = (): PropertyDecorator =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => normalizeTogoPhone(value)),
    IsString(),
    Matches(/^\d{8}$/, { message: 'Le numéro WhatsApp doit être un numéro togolais à 8 chiffres' }),
  );

// L'agence déclare l'accord (→ « en attente » du OUI du locataire).
export class AgencyConsentRequestDto {
  @ApiProperty({ example: '90330557', description: 'Numéro WhatsApp du locataire' })
  @WhatsappPhone()
  whatsappPhone!: string;

  @ApiProperty({ enum: WhatsappConsentMethod, description: 'Façon dont l’accord a été recueilli' })
  @IsEnum(WhatsappConsentMethod)
  collectionMethod!: WhatsappConsentMethod;

  @ApiProperty({
    description: 'Case cochée par l’agent : « J’atteste que le locataire a accepté de recevoir les messages de service WARAH sur WhatsApp »',
  })
  @IsBoolean()
  @Equals(true, { message: 'L’attestation doit être cochée' })
  attestation!: boolean;
}

// L'agence note un refus ou un retrait exprimé par le locataire.
export class AgencyConsentRefusalDto {
  @ApiProperty({ enum: WhatsappConsentMethod })
  @IsEnum(WhatsappConsentMethod)
  collectionMethod!: WhatsappConsentMethod;
}

export class WhatsappPhoneDto {
  @ApiProperty({ example: '90330557' })
  @WhatsappPhone()
  whatsappPhone!: string;
}

// Interrupteur de l'espace locataire.
export class TenantConsentDto {
  @ApiProperty({ enum: ['ACCEPT', 'WITHDRAW'] })
  @IsIn(['ACCEPT', 'WITHDRAW'])
  action!: 'ACCEPT' | 'WITHDRAW';

  @ApiPropertyOptional({ example: '90330557', description: 'Numéro WhatsApp, si différent de celui enregistré' })
  @IsOptional()
  @WhatsappPhone()
  whatsappPhone?: string;
}
