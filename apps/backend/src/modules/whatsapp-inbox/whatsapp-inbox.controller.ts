import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ConversationSummary, InboxMessage, WhatsappInboxService } from './whatsapp-inbox.service';
import { ListConversationsQueryDto, ListMessagesQueryDto, ReplyToConversationDto } from './dto/whatsapp-inbox.dto';

// Messagerie WhatsApp avec les locataires (unité 48). Aucune logique ici :
// droits et règles dans WhatsappInboxService (canActOnProperty à chaque appel).
@ApiTags('WhatsApp — Messages')
@ApiBearerAuth()
@Controller('whatsapp/conversations')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class WhatsappInboxController {
  constructor(private readonly inbox: WhatsappInboxService) {}

  @Get()
  @ApiOperation({ summary: 'Conversations des biens visibles, les plus récentes d’abord' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<{ data: ConversationSummary[]; total: number; page: number; limit: number }> {
    return this.inbox.list(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de conversations avec des messages non lus (responsable du bien)' })
  unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    return this.inbox.unreadCount(user);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Messages d’une conversation (ne marque rien comme lu)' })
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<{ conversation: ConversationSummary; messages: InboxMessage[]; nextCursor: string | null }> {
    return this.inbox.messages(user, id, query);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marque la conversation comme lue (responsable du bien seulement)' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<{ read: true }> {
    return this.inbox.markRead(user, id);
  }

  @Post(':id/reply')
  @ApiOperation({
    summary: 'Répond au locataire sur WhatsApp',
    description: '409 si la fenêtre de 24 h est fermée ou si le locataire ne reçoit plus de messages.',
  })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReplyToConversationDto,
  ): Promise<InboxMessage> {
    return this.inbox.reply(user, id, dto);
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Termine l’échange : le robot reprend la main' })
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<{ closed: boolean }> {
    return this.inbox.close(user, id);
  }
}
