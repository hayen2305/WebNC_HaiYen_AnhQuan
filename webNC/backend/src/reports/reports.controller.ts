import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportQueryDto } from './dto/report.dto';
import { ReportsService, sendWorkbook } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports/revenue')
  @Auth('ADMIN')
  revenue(@Query() query: ReportQueryDto) {
    return this.reportsService.revenue(query);
  }

  // @Res() (không passthrough): service tự ghi file xlsx vào response
  @Get('reports/revenue/export')
  @Auth('ADMIN')
  async exportRevenue(@Query() query: ReportQueryDto, @Res() res: Response) {
    const wb = await this.reportsService.revenueWorkbook(query);
    await sendWorkbook(res, wb, 'doanh-thu.xlsx');
  }

  @Get('invoices/tenant/export')
  @Auth('TENANT')
  async exportTenantInvoices(
    @CurrentUser() user: AuthUser,
    @Query() query: { from?: string; to?: string },
    @Res() res: Response,
  ) {
    const wb = await this.reportsService.tenantInvoicesWorkbook(user.id, { from: query.from, to: query.to });
    await sendWorkbook(res, wb, 'hoa-don.xlsx');
  }
}
