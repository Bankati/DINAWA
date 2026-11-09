import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO de réponse de POST /auth/invite/tenant, pour les types frontend générés
// (`npm run types:sync`). `user` et `lease` restent décrits comme des objets
// libres : l'écran d'invitation ne lit que `invitationUrl` et
// `whatsappBotNumber`.
export class InviteTenantResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  user!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  lease!: Record<string, unknown>;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Lien d'activation du compte — null quand le locataire existait déjà (nouveau bail, pas de nouvelle invitation).",
  })
  invitationUrl!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '22899327312',
    description:
      'Numéro WhatsApp du robot WARAH, international sans « + » — null si WhatsApp est éteint ou le numéro non configuré.',
  })
  whatsappBotNumber!: string | null;

  @ApiProperty({
    description:
      'Accord du locataire déjà inscrit (09/11/2026) : true quand le locataire a déjà un compte activé. ' +
      'Le bail est alors PENDING_TENANT, invitationUrl est null et confirmationId est présent.',
  })
  confirmationRequired!: boolean;

  @ApiPropertyOptional({ description: 'Identifiant de la demande de confirmation (si confirmationRequired)' })
  confirmationId?: string;

  @ApiPropertyOptional({
    enum: ['EMAIL', 'IN_APP', 'WHATSAPP'],
    isArray: true,
    description:
      'Si confirmationRequired : par où la demande est partie. EMAIL et IN_APP toujours, WHATSAPP si Meta a accepté le message.',
  })
  channels?: ('EMAIL' | 'IN_APP' | 'WHATSAPP')[];
}
