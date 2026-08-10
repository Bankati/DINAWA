import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Property, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MandatesService } from './mandates.service';

@ApiTags('Mandates')
@ApiBearerAuth()
@Controller('manager')
@Roles(UserRole.MANAGER)
export class ManagerController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Get('portfolio')
  @ApiOperation({
    summary: 'Biens sous mandat actif du gestionnaire connecté, distincts de ses propres biens',
  })
  getPortfolio(@CurrentUser() user: AuthenticatedUser): Promise<Property[]> {
    return this.mandatesService.getManagerPortfolio(user);
  }
}
