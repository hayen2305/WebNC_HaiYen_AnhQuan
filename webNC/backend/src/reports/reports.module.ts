import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { ReportRepository } from './report.repository';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InvoicesModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportRepository],
})
export class ReportsModule {}
