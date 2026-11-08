import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';

const makeService = (repo: any) => {
  const cfg: Record<string, string> = {
    VIETQR_BANK_CODE: 'VCB', VIETQR_ACCOUNT_NO: '0123456789', VIETQR_ACCOUNT_NAME: 'CHU TRO',
  };
  return new PaymentService({ get: (k: string) => cfg[k] } as any, repo);
};

describe('PaymentService', () => {
  describe('QR', () => {
    const svc = makeService({});
    it('nội dung chuyển khoản: bỏ khoảng trắng, in hoa', () =>
      expect(svc.buildTransferContent('a 101', 7)).toBe('SEVA1017'));

    it('sinh URL VietQR với số tiền làm tròn', () => {
      const { qrUrl, transferContent } = svc.generateQRCode({ amount: '3500000.4', roomNumber: '101', invoiceId: 12 });
      expect(transferContent).toBe('SEV10112');
      expect(qrUrl).toContain('https://img.vietqr.io/image/VCB-0123456789-compact2.png');
      expect(qrUrl).toContain('amount=3500000');
      expect(qrUrl).toContain('addInfo=SEV10112');
    });
  });

  describe('processBankWebhook', () => {
    const unpaid = [
      { id: 1, room_number: '101', total_amount: 1_000_000 },
      { id: 12, room_number: '101', total_amount: 2_000_000 },
    ];
    const repo = () => ({ findAllUnpaid: jest.fn().mockResolvedValue(unpaid), markPaid: jest.fn().mockResolvedValue(1) });

    it('thiếu nội dung -> 400', async () => {
      await expect(makeService(repo()).processBankWebhook({ content: '' } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('không khớp hóa đơn nào -> 404', async () => {
      await expect(makeService(repo()).processBankWebhook({ content: 'chuyen tien an trua' } as any))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('khớp nội dung (không phân biệt hoa/thường, khoảng trắng) và gạch nợ BANK_TRANSFER', async () => {
      const r = repo();
      const matched = await makeService(r).processBankWebhook({
        content: 'nguyen van a sev 101 12 cam on', amount: 2_000_000, transaction_ref: 'FT123',
      } as any);
      expect(matched.id).toBe(12);
      expect(r.markPaid).toHaveBeenCalledWith(12, expect.objectContaining({ method: 'BANK_TRANSFER', transactionRef: 'FT123' }));
    });

    it('số tiền nhỏ hơn hóa đơn -> 409, không gạch nợ', async () => {
      const r = repo();
      await expect(makeService(r).processBankWebhook({ content: 'SEV10112', amount: 1_999_999 } as any))
        .rejects.toBeInstanceOf(ConflictException);
      expect(r.markPaid).not.toHaveBeenCalled();
    });

    it('hóa đơn đã được thanh toán song song (affected = 0) -> 409', async () => {
      const r = repo();
      r.markPaid.mockResolvedValue(0);
      await expect(makeService(r).processBankWebhook({ content: 'SEV10112' } as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('mã giao dịch trùng (ER_DUP_ENTRY) -> 409', async () => {
      const r = repo();
      r.markPaid.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
      await expect(makeService(r).processBankWebhook({ content: 'SEV10112', transaction_ref: 'X' } as any))
        .rejects.toBeInstanceOf(ConflictException);
    });
  });
});
