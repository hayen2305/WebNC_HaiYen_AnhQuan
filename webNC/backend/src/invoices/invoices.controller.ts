import {
  BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Put,
  Query, ServiceUnavailableException, UnauthorizedException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { mediaUploadOptions } from '../common/upload/upload.options';
import { BankWebhookDto, CreateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';
import { ReminderService } from './reminder.service';

@Controller('invoices')
export class InvoicesController {
  private readonly cronSecret?: string;
  private readonly bankWebhookSecret?: string;

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly reminderService: ReminderService,
    config: ConfigService,
  ) {
    this.cronSecret = config.get('CRON_SECRET');
    this.bankWebhookSecret = config.get('BANK_WEBHOOK_SECRET');
  }

  /** So sánh secret theo thời gian hằng định để tránh timing attack. */
  private secretMatches(expected: string, provided?: string) {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided ?? '');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  @Post('scan-bill')
  @HttpCode(200)
  @Auth('ADMIN')
  @UseInterceptors(FileInterceptor('file', mediaUploadOptions))
  scanBill(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng đính kèm file ảnh hoặc PDF hóa đơn.');
    return this.invoicesService.scanBill(file.buffer, file.mimetype);
  }

  @Post()
  @Auth('ADMIN')
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    const result = await this.invoicesService.createInvoice(dto);
    return { ...result, message: 'Tạo hóa đơn thành công, đã sinh mã QR thanh toán.' };
  }

  @Get('admin')
  @Auth('ADMIN')
  getAllInvoices(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.listAll(query);
  }

  @Get('tenant')
  @Auth('TENANT')
  getTenantInvoices(@CurrentUser() user: AuthUser) {
    return this.invoicesService.listForTenant(user.id);
  }

  @Put(':id/pay')
  @Auth('ADMIN')
  async payInvoice(@Param('id') id: string) {
    await this.invoicesService.markPaid(id);
    return { message: 'Đã cập nhật hóa đơn sang trạng thái Đã thanh toán.' };
  }

  // ---- Endpoint hệ thống-tới-hệ thống, bảo vệ bằng secret riêng thay vì JWT người dùng ----

  @Post('trigger-reminders')
  @HttpCode(200)
  async triggerReminders(@Headers('x-cron-secret') secret?: string) {
    if (!this.cronSecret) {
      throw new ServiceUnavailableException('Tiến trình nhắc nợ chưa được cấu hình bảo mật.');
    }
    if (!this.secretMatches(this.cronSecret, secret)) {
      throw new UnauthorizedException('Thiếu hoặc sai x-cron-secret.');
    }
    const summary = await this.reminderService.runOnce();
    return { message: 'Đã chạy tiến trình nhắc nợ.', ...summary };
  }

  @Post('bank-webhook')
  @HttpCode(200)
  async bankWebhook(@Headers('x-webhook-secret') secret: string | undefined, @Body() body: BankWebhookDto) {
    if (!this.bankWebhookSecret) {
      throw new ServiceUnavailableException('Webhook ngân hàng chưa được cấu hình bảo mật.');
    }
    if (!this.secretMatches(this.bankWebhookSecret, secret)) {
      throw new UnauthorizedException('Sai chữ ký webhook.');
    }
    const matched = await this.invoicesService.handleBankWebhook(body);
    return { message: 'Gạch nợ tự động thành công.', invoice_id: matched.id };
  }
}
