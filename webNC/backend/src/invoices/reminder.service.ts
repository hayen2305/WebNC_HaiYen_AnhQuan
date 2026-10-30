import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { todayInAppTz } from '../common/date.util';
import { InvoiceRepository } from './invoice.repository';

/**
 * ReminderService (Reminder Engine) — quét hóa đơn UNPAID mỗi ngày và gửi thông báo đúng mốc:
 *  Trước hạn: còn 7 ngày -> nhắc lần 1 | còn 5 ngày -> nhắc lần 2
 *  Sau hạn:  quá 3 ngày -> báo lần 1 | quá 5 ngày -> báo lần 2 | quá >=6 ngày -> nhắc mỗi ngày
 */
@Injectable()
export class ReminderService implements OnModuleInit {
  private readonly logger = new Logger('ReminderEngine');

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /** Đăng ký lịch chạy khi ENABLE_REMINDER_CRON=true (mặc định 08:00 hằng ngày). */
  onModuleInit() {
    if (this.config.get('ENABLE_REMINDER_CRON') !== 'true') {
      this.logger.log('⏸️  ReminderEngine đang TẮT (ENABLE_REMINDER_CRON != true).');
      return;
    }
    const cronTime = this.config.get<string>('REMINDER_CRON_TIME') || '0 8 * * *';
    const job = CronJob.from({
      cronTime,
      onTick: async () => {
        this.logger.log(`⏰ [CRON] Bắt đầu quét nhắc nợ lúc ${new Date().toISOString()}`);
        try {
          const summary = await this.runOnce();
          this.logger.log(`✅ [CRON] Hoàn tất: ${summary.checked} hóa đơn kiểm tra, ${summary.sent} thông báo đã gửi.`);
        } catch (err) {
          this.logger.error(`❌ [CRON] Lỗi khi chạy tiến trình nhắc nợ: ${(err as Error).message}`);
        }
      },
      start: true,
    });
    this.schedulerRegistry.addCronJob('invoice-reminder', job);
    this.logger.log(`⏱️  Đã đăng ký ReminderEngine: "${cronTime}"`);
  }

  private daysBetween(dueDateStr: string, todayStr: string) {
    const due = new Date(String(dueDateStr).slice(0, 10) + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }

  private todayISO() {
    return todayInAppTz();
  }

  private resolveStage(diffDays: number) {
    if (diffDays === 7) return { stage: 'PRE_DUE_1', message: 'Nhắc hạn lần 1: còn 7 ngày tới hạn thanh toán.' };
    if (diffDays === 5) return { stage: 'PRE_DUE_2', message: 'Nhắc hạn lần 2: còn 5 ngày tới hạn thanh toán.' };
    if (diffDays === -3) return { stage: 'OVERDUE_1', message: 'Báo quá hạn lần 1: hóa đơn đã quá hạn 3 ngày.' };
    if (diffDays === -5) return { stage: 'OVERDUE_2', message: 'Báo quá hạn lần 2: hóa đơn đã quá hạn 5 ngày.' };
    if (diffDays <= -6) return { stage: 'OVERDUE_DAILY', message: `Nhắc nợ hàng ngày: đã quá hạn ${-diffDays} ngày.` };
    return null;
  }

  /** Gửi thông báo thực tế (email/SMS/Zalo ZNS/push) — hiện chỉ log, thay bằng dịch vụ thật khi lên production. */
  private async sendNotification(
    invoice: { id: number; room_number: string; tenant_name: string },
    stageInfo: { message: string },
  ) {
    this.logger.log(`[REMINDER] -> Phòng ${invoice.room_number} (${invoice.tenant_name}) | Hóa đơn #${invoice.id} | ${stageInfo.message}`);
  }

  /** Chạy 1 lượt quét toàn bộ hóa đơn UNPAID. Gọi bởi cron hoặc API thủ công. */
  async runOnce() {
    const today = this.todayISO();
    const invoices = await this.invoiceRepository.findAllUnpaid();

    let sent = 0;
    const details: { invoice_id: number; room_number: string; stage: string }[] = [];

    for (const invoice of invoices) {
      const stageInfo = this.resolveStage(this.daysBetween(invoice.due_date, today));
      if (!stageInfo) continue;

      await this.sendNotification(invoice, stageInfo);
      await this.invoiceRepository.incrementReminder(invoice.id);

      sent += 1;
      details.push({ invoice_id: invoice.id, room_number: invoice.room_number, stage: stageInfo.stage });
    }

    return { checked: invoices.length, sent, details };
  }
}
