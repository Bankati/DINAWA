import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

// POST /lease-confirmations/:id/resend (contrat d'API du 09/11/2026) : corps
// facultatif pour corriger le numéro ou l'email avant de renvoyer. Mêmes
// règles que l'invitation (InviteTenantDto).
export class ResendLeaseConfirmationDto {
  @ApiPropertyOptional({ example: '90123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'phone doit être un numéro valide' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
