import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Lease, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { LeasesService } from './leases.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';

@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: "Crée un bail — génère le calendrier d'échéances et passe le bien à OCCUPIED",
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaseDto): Promise<Lease> {
    return this.leasesService.create(user, dto);
  }

  @Post(':id/terminate')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Résilie un bail — libère le bien (VACANT), historique conservé' })
  terminate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TerminateLeaseDto,
  ): Promise<Lease> {
    return this.leasesService.terminate(user, id, dto);
  }
}
