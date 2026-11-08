import { Injectable } from '@nestjs/common';
import { addDays, countDaysInclusive, isValidDate, nowInAppTz } from '../common/date.util';
import { httpError } from '../common/http-error';
import { ContractRepository } from '../contracts/contract.repository';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { OcrService } from '../integrations/ocr.service';
import { RoomRepository } from '../rooms/room.repository';
import { Invoice } from './entities/invoice.entity';
import { InvoiceRepository } from './invoice.repository';
import { PaymentService } from './payment.service';

const PAY_METHODS: string[] = ['CASH', 'BANK_TRANSFER', 'MOMO', 'OTHER'];
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** 'YYYY-MM' -> year*12+month (dùng để lọc theo kỳ hóa đơn). */
function monthIndex(v: any, label: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  const m = MONTH_RE.exec(String(v));
  if (!m) throw httpError(400, `${label} phải có dạng YYYY-MM.`);
  return Number(m[1]) * 12 + Number(m[2]);
}

/** Số tiền hợp lệ: số nguyên không âm (VNĐ). Không nhập -> null; sai định dạng -> NaN. */
function parseAmount(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/** Chuẩn hóa số tiền AI đọc được ("350.000 đ" -> 350000); không đọc được -> null. */
function normalizeAiAmount(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  const digits = String(value).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/**
 * InvoiceService — tạo hóa đơn theo SỐ TIỀN (điện, nước, phụ phí đều tính bằng VNĐ),
 * điều phối OCRService (đọc số tiền từ hóa đơn gốc), CloudinaryService (lưu file gốc),
 * và PaymentService (sinh QR + xử lý webhook).
 */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly contractRepository: ContractRepository,
    private readonly roomRepository: RoomRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly ocrService: OcrService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Quét ảnh/PDF hóa đơn điện nước gốc bằng AI Vision (OCRService) để đọc SỐ TIỀN,
   * đồng thời lưu file gốc lên Cloudinary (CloudinaryService) để tham chiếu sau này.
   */
  async scanBill(fileBuffer: Buffer, mimeType: string) {
    const uploadResult = await this.cloudinaryService.uploadBuffer(fileBuffer, {
      folder: 'rental_management/bills',
      resourceType: 'auto',
    });
    const reading = await this.ocrService.extractBillAmounts(fileBuffer.toString('base64'), mimeType);

    return {
      bill_file_url: uploadResult.secure_url,
      electricity_amount: normalizeAiAmount(reading.electricity_amount),
      water_amount: normalizeAiAmount(reading.water_amount),
      confidence: reading.confidence,
      raw_text: reading.raw_text,
    };
  }

  /**
   * Tạo hóa đơn mới. Hợp đồng THÁNG: tiền phòng = monthly_fee của hợp đồng, tiền điện/nước/phụ phí do admin nhập (VNĐ).
   * Hợp đồng NGÀY: tiền phòng = daily_fee × số ngày thuê nằm trong kỳ, không có điện/nước/phụ phí.
   * Mỗi hợp đồng chỉ có 1 hóa đơn cho mỗi kỳ (tháng/năm). Sau khi lưu DB, nhờ PaymentService sinh mã QR.
   */
  async createInvoice(data: any = {}) {
    const { contract_id, month, year, due_date } = data;
    if (!contract_id || !month || !year || !due_date) {
      throw httpError(400, 'Thiếu thông tin bắt buộc để tạo hóa đơn.');
    }
    if (!Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12 ||
        !Number.isInteger(Number(year)) || Number(year) < 2000 || Number(year) > 2100) {
      throw httpError(400, 'Kỳ hóa đơn không hợp lệ.');
    }
    if (!isValidDate(due_date)) throw httpError(400, 'Hạn thanh toán không hợp lệ.');

    const contract = await this.contractRepository.findById(contract_id);
    if (!contract) throw httpError(404, 'Không tìm thấy hợp đồng.');
    if (!['ACTIVE', 'EXPIRED'].includes(contract.status)) {
      throw httpError(409, 'Chỉ lập hóa đơn cho hợp đồng đang hiệu lực hoặc đã kết thúc.');
    }

    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = addDays(new Date(Date.UTC(Number(year), Number(month), 1)).toISOString().slice(0, 10), -1);
    const billableStart = contract.start_date > periodStart ? contract.start_date : periodStart;
    const billableEnd = contract.end_date < periodEnd ? contract.end_date : periodEnd;
    if (billableStart > billableEnd) {
      throw httpError(400, 'Kỳ hóa đơn không nằm trong thời gian thuê của hợp đồng.');
    }

    let roomFee: number;
    let electricity = 0;
    let water = 0;
    let otherFee = 0;

    if (contract.rental_type === 'DAILY') {
      roomFee = Number(contract.daily_fee) * countDaysInclusive(billableStart, billableEnd);
    } else {
      const e = parseAmount(data.electricity);
      const w = parseAmount(data.water);
      const o = parseAmount(data.other_fee);
      if (e === null || w === null || Number.isNaN(e) || Number.isNaN(w) || Number.isNaN(o)) {
        throw httpError(400, 'Tiền điện, tiền nước và phụ phí phải là số tiền nguyên không âm (VNĐ).');
      }
      electricity = e;
      water = w;
      otherFee = o ?? 0;
      roomFee = Number(contract.monthly_fee);
    }

    const calc = Invoice.calculate({ roomPrice: roomFee, electricity, water, otherFee });

    let invoiceId: number;
    try {
      invoiceId = await this.invoiceRepository.create({
        contract_id, month: Number(month), year: Number(year),
        room_fee: calc.roomFee, electricity: calc.electricity, water: calc.water,
        other_fee: calc.otherFee, due_date, bill_file_url: data.bill_file_url,
      });
    } catch (err: any) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw httpError(409, `Hợp đồng này đã có hóa đơn tháng ${month}/${year}.`);
      }
      throw err;
    }

    const { qrUrl, transferContent } = this.paymentService.generateQRCode({
      amount: calc.totalAmount, roomNumber: contract.room_number, invoiceId,
    });

    return { id: invoiceId, total_amount: calc.totalAmount, qr_url: qrUrl, transfer_content: transferContent };
  }

  /**
   * Sửa hóa đơn: hạn thanh toán, tiền phòng/điện/nước/phụ phí (VNĐ), trạng thái. Tổng tiền do DB tính.
   * Chuyển sang PAID ghi ngày thanh toán; về UNPAID xóa thông tin thanh toán.
   * Hóa đơn đã thanh toán chỉ sửa được số tiền sau khi đặt lại về "Chưa thanh toán".
   */
  async updateInvoice(id: string, data: any = {}) {
    const inv = await this.invoiceRepository.findById(id);
    if (!inv) throw httpError(404, 'Không tìm thấy hóa đơn.');

    const status = data.payment_status ?? inv.payment_status;
    if (!['UNPAID', 'PAID'].includes(status)) throw httpError(400, 'Trạng thái thanh toán không hợp lệ.');
    const touchesAmounts = ['room_fee', 'electricity', 'water', 'other_fee', 'due_date']
      .some((k) => data[k] !== undefined);
    if (inv.payment_status === 'PAID' && status === 'PAID' && touchesAmounts) {
      throw httpError(409, 'Hóa đơn đã thanh toán, hãy chuyển về "Chưa thanh toán" trước khi sửa số tiền.');
    }

    const amount = (key: string, label: string) => {
      if (data[key] === undefined) return Number((inv as any)[key] || 0);
      const n = parseAmount(data[key]);
      if (n === null || Number.isNaN(n)) throw httpError(400, `${label} phải là số tiền nguyên không âm (VNĐ).`);
      return n;
    };
    const room_fee = amount('room_fee', 'Tiền phòng');
    const electricity = amount('electricity', 'Tiền điện');
    const water = amount('water', 'Tiền nước');
    const other_fee = amount('other_fee', 'Phụ phí');

    let due_date = inv.due_date;
    if (data.due_date !== undefined) {
      if (!isValidDate(data.due_date)) throw httpError(400, 'Hạn thanh toán không hợp lệ.');
      due_date = data.due_date;
    }

    let paid_at: string | null = null;
    let payment_method: string | null = null;
    let transaction_ref: string | null = null;
    if (status === 'PAID') {
      if (inv.payment_status === 'PAID') {
        ({ paid_at, payment_method, transaction_ref } = inv as any);
      } else {
        paid_at = nowInAppTz();
        payment_method = PAY_METHODS.includes(data.payment_method) ? data.payment_method : 'CASH';
      }
    }

    await this.invoiceRepository.update(id, {
      room_fee, electricity, water, other_fee, due_date, payment_status: status,
      paid_at, payment_method, transaction_ref,
    });
    return { total_amount: room_fee + electricity + water + other_fee };
  }

  async deleteInvoice(id: string) {
    const affected = await this.invoiceRepository.delete(id);
    if (affected === 0) throw httpError(404, 'Không tìm thấy hóa đơn.');
  }

  async listAll(filters: any) {
    return this.invoiceRepository.findAll(filters);
  }

  /**
   * Hóa đơn của tenant (lọc theo kỳ from/to dạng YYYY-MM), kèm QR cho hóa đơn UNPAID.
   */
  async listForTenant(tenantId: number, { from, to }: { from?: string; to?: string } = {}) {
    const fromIdx = monthIndex(from, 'Từ tháng');
    const toIdx = monthIndex(to, 'Đến tháng');
    if (fromIdx !== null && toIdx !== null && fromIdx > toIdx) throw httpError(400, 'Khoảng thời gian không hợp lệ.');
    const rows = await this.invoiceRepository.findByTenant(tenantId, { fromIdx, toIdx });
    return rows.map((row: any) => {
      if (row.payment_status === 'UNPAID') {
        const { qrUrl, transferContent } = this.paymentService.generateQRCode({
          amount: row.total_amount, roomNumber: row.room_number, invoiceId: row.id,
        });
        return { ...row, qr_url: qrUrl, transfer_content: transferContent };
      }
      return row;
    });
  }

  async markPaid(invoiceId: string, method?: string) {
    const inv = await this.invoiceRepository.findById(invoiceId);
    if (!inv) throw httpError(404, 'Không tìm thấy hóa đơn.');
    if (inv.payment_status === 'PAID') throw httpError(409, 'Hóa đơn này đã được thanh toán.');
    await this.invoiceRepository.markPaid(invoiceId, {
      paidAt: nowInAppTz(), method: PAY_METHODS.includes(method as string) ? (method as string) : 'CASH',
    });
  }

  async handleBankWebhook(payload: any) {
    return this.paymentService.processBankWebhook(payload);
  }
}
