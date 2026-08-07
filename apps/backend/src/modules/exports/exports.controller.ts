import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('paiements')
  @ApiOperation({ summary: 'Export PDF historique des paiements' })
  async paiements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.exportsService.paiementsPDF(user, from, to);
    const date = from && to ? `${from}_${to}` : new Date().toISOString().slice(0, 10);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="warah-paiements-${date}.pdf"`);
    res!.send(buffer);
  }

  @Get('biens')
  @ApiOperation({ summary: 'Export PDF liste des biens' })
  async biens(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res?: Response,
  ) {
    const buffer = await this.exportsService.biensPDF(user);
    const date = new Date().toISOString().slice(0, 10);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="warah-biens-${date}.pdf"`);
    res!.send(buffer);
  }

  @Get('locataires')
  @ApiOperation({ summary: 'Export PDF liste des locataires' })
  async locataires(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res?: Response,
  ) {
    const buffer = await this.exportsService.locatairesPDF(user);
    const date = new Date().toISOString().slice(0, 10);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="warah-locataires-${date}.pdf"`);
    res!.send(buffer);
  }

  @Get('rapport')
  @ApiOperation({ summary: 'Export PDF rapport financier mensuel' })
  async rapport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.exportsService.rapportPDF(user, from, to);
    const date = from && to ? `${from}_${to}` : new Date().toISOString().slice(0, 10);
    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="warah-rapport-${date}.pdf"`);
    res!.send(buffer);
  }
}
