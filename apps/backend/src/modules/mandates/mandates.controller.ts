import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Mandate, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MandatesService } from './mandates.service';
import { CreateMandateDto } from './dto/create-mandate.dto';

@ApiTags('Mandates')
@ApiBearerAuth()
@Controller('mandates')
export class MandatesController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Délègue un ou plusieurs biens à un gestionnaire' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMandateDto,
  ) {
    return this.mandatesService.create(user, dto);
  }

  @Get()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Liste tous les mandats actifs du propriétaire courant' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.mandatesService.list(user);
  }

  @Get('received')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Mandats reçus par le gestionnaire courant' })
  listReceived(@CurrentUser() user: AuthenticatedUser) {
    return this.mandatesService.listReceived(user);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Révoque un mandat actif' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Mandate> {
    return this.mandatesService.revoke(user, id);
  }
}
