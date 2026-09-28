import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Payout, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedPayouts, PayoutsService } from './payouts.service';
import { ListPayoutsQueryDto } from './dto/list-payouts-query.dto';

// Supervision des reversements — réservé aux admins (voir /architect
// reversement 2026-09-25 : page admin avec relance manuelle des échecs).
@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des reversements de loyers (super admin)' })
  list(@Query() query: ListPayoutsQueryDto): Promise<PaginatedPayouts> {
    return this.payouts.list(query);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Relance un reversement en échec (super admin)' })
  retry(@Param('id') id: string): Promise<Payout> {
    return this.payouts.retry(id);
  }
}
