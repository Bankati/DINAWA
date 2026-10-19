import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { WHATSAPP_AGENCY_REPLY_MAX_LENGTH, WHATSAPP_INBOX_MESSAGES_PAGE } from '../../../common/constants';

export const CONVERSATION_STATUSES = ['open', 'closed'] as const;
export type ConversationStatusFilter = (typeof CONVERSATION_STATUSES)[number];

export class ListConversationsQueryDto {
  @ApiPropertyOptional({ enum: CONVERSATION_STATUSES, description: 'Échanges en cours ou terminés' })
  @IsOptional()
  @IsIn(CONVERSATION_STATUSES)
  status?: ConversationStatusFilter;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Identifiant du plus ancien message déjà affiché (page précédente)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  before?: string;

  @ApiPropertyOptional({ default: WHATSAPP_INBOX_MESSAGES_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = WHATSAPP_INBOX_MESSAGES_PAGE;
}

export class ReplyToConversationDto {
  @ApiProperty({ maxLength: WHATSAPP_AGENCY_REPLY_MAX_LENGTH, description: 'Texte envoyé tel quel au locataire' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Le message est vide' })
  @MaxLength(WHATSAPP_AGENCY_REPLY_MAX_LENGTH, {
    message: `Le message ne doit pas dépasser ${WHATSAPP_AGENCY_REPLY_MAX_LENGTH} caractères`,
  })
  text!: string;
}
