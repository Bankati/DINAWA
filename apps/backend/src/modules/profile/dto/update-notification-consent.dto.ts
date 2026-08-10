import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateNotificationConsentDto {
  // NOT_ASKED n'est pas un choix utilisateur valide — c'est l'état initial
  // avant toute décision (voir schema.prisma, NotificationConsent).
  @ApiProperty({ enum: ['ACCEPTED', 'DECLINED'] })
  @IsIn(['ACCEPTED', 'DECLINED'])
  consent!: 'ACCEPTED' | 'DECLINED';
}
