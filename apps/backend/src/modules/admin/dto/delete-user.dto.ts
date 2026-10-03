import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Motif obligatoire — même exigence que SuspendUserDto, ajoutée après coup
// (voir /architect journal d'audit, 2026-10-02) : une suppression de compte
// ne capturait jusqu'ici aucun motif dans AuditLog.metadata (corps de
// requête DELETE vide), rendant impossible de comprendre après coup
// pourquoi un compte précis avait été supprimé.
export class DeleteUserDto {
  @ApiProperty({ description: 'Motif de la suppression — tracé dans le journal d’audit' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
