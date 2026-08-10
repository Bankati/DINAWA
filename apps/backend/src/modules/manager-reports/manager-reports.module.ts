import { Module } from '@nestjs/common';
import { ManagerReportsController } from './manager-reports.controller';
import { ManagerReportsService } from './manager-reports.service';
import { MonthlyReportPdfService } from './monthly-report-pdf.service';

@Module({
  controllers: [ManagerReportsController],
  providers: [ManagerReportsService, MonthlyReportPdfService],
  exports: [ManagerReportsService, MonthlyReportPdfService],
})
export class ManagerReportsModule {}
