import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { MandatesService, ManagerSummary } from './mandates.service';
import { SearchManagerQueryDto } from './dto/search-manager-query.dto';

@ApiTags('Mandates')
@ApiBearerAuth()
@Controller('managers')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ManagersController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Retrouve le managerId d’un gestionnaire par email ou téléphone exact',
  })
  search(@Query() query: SearchManagerQueryDto): Promise<ManagerSummary[]> {
    return this.mandatesService.searchManagers(query);
  }
}
