import { ApiProperty } from '@nestjs/swagger';

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
}
