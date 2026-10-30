import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nowInAppTz } from '../common/date.util';
import { BankWebhookDto } from './dto/invoice.dto';
import { InvoiceRepository } from './invoice.repository';

/**
 * PaymentService — (1) sinh QR VietQR cho từng hóa đơn,
 * (2) xử lý webhook ngân hàng để tự động gạch nợ (Auto-Matching).
 */
@Injectable()
export class PaymentService {
  private readonly bankCode?: string;
  private readonly accountNo?: string;
  private readonly accountName?: string;
  private readonly template: string;

  constructor(config: ConfigService, private readonly invoiceRepository: InvoiceRepository) {
    this.bankCode = config.get('VIETQR_BANK_CODE');
    this.accountNo = config.get('VIETQR_ACCOUNT_NO');
    this.accountName = config.get('VIETQR_ACCOUNT_NAME');
    this.template = config.get('VIETQR_TEMPLATE') || 'compact2';
  }

  buildTransferContent(roomNumber: string, invoiceId: number | string) {
    return `SEV${roomNumber}${invoiceId}`.replace(/\s+/g, '').toUpperCase();
  }

  generateQRCode({ amount, roomNumber, invoiceId }: { amount: number | string; roomNumber: string; invoiceId: number | string }) {
    const addInfo = this.buildTransferContent(roomNumber, invoiceId);
    const params = new URLSearchParams({
      amount: String(Math.round(Number(amount))),
      addInfo,
      accountName: this.accountName || '',
    });
    const qrUrl = `https://img.vietqr.io/image/${this.bankCode}-${this.accountNo}-${this.template}.png?${params.toString()}`;
    return { qrUrl, transferContent: addInfo };
  }

  /** Tìm hóa đơn UNPAID khớp nội dung chuyển khoản, đối chiếu số tiền rồi đánh dấu PAID. */
  async processBankWebhook({ content, amount, transaction_ref }: BankWebhookDto) {
    if (!content) throw new BadRequestException('Thiếu nội dung chuyển khoản.');

    const unpaidInvoices = await this.invoiceRepository.findAllUnpaid();
    const normalizedContent = content.replace(/\s+/g, '').toUpperCase();

    const matched = unpaidInvoices.find((inv) =>
      normalizedContent.includes(this.buildTransferContent(inv.room_number, inv.id)),
    );
    if (!matched) throw new NotFoundException('Không khớp được hóa đơn nào với nội dung chuyển khoản.');
    if (amount != null && Number(amount) < Number(matched.total_amount)) {
      throw new ConflictException('Số tiền chuyển khoản nhỏ hơn số tiền hóa đơn, cần đối soát thủ công.');
    }

    try {
      const affected = await this.invoiceRepository.markPaid(matched.id, {
        paidAt: nowInAppTz(), method: 'BANK_TRANSFER',
        transactionRef: transaction_ref ? String(transaction_ref).slice(0, 100) : null,
      });
      if (!affected) throw new ConflictException('Hóa đơn đã được thanh toán trước đó.');
    } catch (e: any) {
      if (e && e.code === 'ER_DUP_ENTRY') throw new ConflictException('Giao dịch này đã được ghi nhận trước đó.');
      throw e;
    }
    return matched;
  }
}
