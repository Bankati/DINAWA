import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Lease, PaymentScheduleEntry, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { LeasesService } from './leases.service';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';

@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

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

  @Get(':id/schedule')
  // Accessible au locataire lui-même en plus des rôles habituels (voir
  // LeasesService.getSchedule()).
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.TENANT)
  @ApiOperation({ summary: "Calendrier complet des échéances d'un bail" })
  getSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PaymentScheduleEntry[]> {
    return this.leasesService.getSchedule(user, id);
  }
}
