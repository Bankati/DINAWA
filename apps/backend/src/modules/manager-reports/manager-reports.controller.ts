import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ManagerReportsService, currentMonthRange } from './manager-reports.service';
import { MonthlyReportPdfService } from './monthly-report-pdf.service';

@ApiTags('Manager Reports')
@ApiBearerAuth()
@Controller('manager/owners')
@Roles(UserRole.MANAGER)
export class ManagerReportsController {
  constructor(
    private readonly managerReports: ManagerReportsService,
    private readonly reportPdf: MonthlyReportPdfService,
  ) {}

  @Get(':ownerId/report/preview.pdf')
  @ApiOperation({
    summary: 'Prévisualisation du rapport mensuel courant pour un propriétaire mandant',
    description:
      "Couvre le mois civil en cours, avec les données disponibles jusqu'à maintenant — pas le dernier rapport déjà envoyé. Réservé au gestionnaire ayant au moins un mandat ACTIVE avec ce propriétaire.",
  })
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ownerId') ownerId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const period = currentMonthRange();
    const data = await this.managerReports.getConsolidatedReportData(user.id, ownerId, period);
    const pdf = await this.reportPdf.generate(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-warah-${period.label}.pdf"`,
    });

    return new StreamableFile(pdf);
  }
}
