import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Mandate, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AllowWhileSuspended } from '../../common/decorators/allow-while-suspended.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MandatesService, MandateWithProperty } from './mandates.service';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { RevokeMandateDto } from './dto/revoke-mandate.dto';
import { ListMandatesQueryDto } from './dto/list-mandates-query.dto';

@ApiTags('Mandates')
@ApiBearerAuth()
@Controller('mandates')
export class MandatesController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Propose un mandat de gestion à un gestionnaire pour un ou plusieurs biens',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMandateDto,
  ): Promise<MandateWithProperty[]> {
    return this.mandatesService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary:
      'Liste les mandats où l’appelant est propriétaire mandant ou gestionnaire destinataire',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMandatesQueryDto,
  ): Promise<MandateWithProperty[]> {
    return this.mandatesService.findAllForUser(user, query.status);
  }

  @Post(':id/accept')
  @Roles(UserRole.MANAGER)
  // Doit rester accessible même à un compte SUSPENDED_INACTIVITY — c'est
  // justement l'action qui peut le débloquer (build-plan.md unité 11/31).
  @AllowWhileSuspended()
  @ApiOperation({ summary: 'Accepte un mandat proposé — réservé au gestionnaire destinataire' })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Mandate> {
    return this.mandatesService.accept(user, id);
  }

  @Post(':id/revoke')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Révoque (ou refuse) un mandat — par le propriétaire ou le gestionnaire',
  })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RevokeMandateDto,
  ): Promise<Mandate> {
    return this.mandatesService.revoke(user, id, dto);
  }
}
