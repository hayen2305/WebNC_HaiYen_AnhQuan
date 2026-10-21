import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractRepository } from '../contracts/contract.repository';
import { CloudinaryService } from '../integrations/cloudinary.service';
import { OcrService } from '../integrations/ocr.service';
import { RoomRepository } from '../rooms/room.repository';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { InvoiceRepository } from './invoice.repository';
import { PaymentService } from './payment.service';

/**
 * InvoicesService — tính tiền điện nước, điều phối OCR (đọc chỉ số), Cloudinary (lưu file gốc)
 * và PaymentService (sinh QR + webhook).
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

  /** Quét ảnh/PDF hóa đơn hoặc công tơ bằng AI Vision, đồng thời lưu file gốc lên Cloudinary. */
  async scanBill(fileBuffer: Buffer, mimeType: string) {
    const uploadResult = await this.cloudinaryService.uploadBuffer(fileBuffer, {
      folder: 'rental_management/bills',
      resourceType: 'auto',
    });
    const reading = await this.ocrService.extractMeterReading(fileBuffer.toString('base64'), mimeType);

    return {
      bill_file_url: uploadResult.secure_url,
      new_electricity: reading.new_electricity,
      new_water: reading.new_water,
      confidence: reading.confidence,
      raw_text: reading.raw_text,
    };
  }

  async createInvoice(data: CreateInvoiceDto) {
    const { contract_id, month, year, electricity, water, due_date } = data || ({} as CreateInvoiceDto);
    if (!contract_id || !month || !year || electricity == null || water == null || !due_date) {
      throw new BadRequestException('Thiếu thông tin bắt buộc để tạo hóa đơn.');
    }
    if (
      !Number.isInteger(Number(electricity)) || Number(electricity) < 0 ||
      !Number.isInteger(Number(water)) || Number(water) < 0
    ) {
      throw new BadRequestException('Chỉ số điện và nước tiêu thụ phải là số nguyên không âm.');
    }
    if (
      !Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12 ||
      !Number.isInteger(Number(year)) || Number(year) < 1
    ) {
      throw new BadRequestException('Kỳ hóa đơn không hợp lệ.');
    }

    const contract = await this.contractRepository.findById(contract_id);
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');

    const room = await this.roomRepository.findById(contract.room_id);
    const roomPrice = room?.price || 0;

    const calc = Invoice.calculate({
      electricity: Number(electricity),
      water: Number(water),
      roomPrice,
      electricityRate: contract.electricity_rate,
      waterRate: contract.water_rate,
      serviceFee: contract.service_fee,
      otherFee: data.other_fee,
    });

    const invoiceId = await this.invoiceRepository.create({
      contract_id, room_id: contract.room_id, tenant_id: contract.tenant_id,
      room_number: contract.room_number, tenant_name: contract.tenant_name, month, year,
      electricity: calc.electricity, water: calc.water,
      room_fee: calc.roomFee, electricity_fee: calc.electricityFee, water_fee: calc.waterFee,
      other_fee: data.other_fee || 0, total_amount: calc.totalAmount,
      due_date, bill_file_url: data.bill_file_url,
    });

    const { qrUrl, transferContent } = this.paymentService.generateQRCode({
      amount: calc.totalAmount, roomNumber: contract.room_number, invoiceId,
    });

    return { id: invoiceId, total_amount: calc.totalAmount, qr_url: qrUrl, transfer_content: transferContent };
  }

  listAll(filters: InvoiceQueryDto) {
    return this.invoiceRepository.findAll(filters);
  }

  /** Hóa đơn của tenant, kèm QR cho các hóa đơn UNPAID để FE hiển thị nút thanh toán. */
  async listForTenant(tenantId: number) {
    const rows = await this.invoiceRepository.findByTenant(tenantId);
    return rows.map((row) => {
      if (row.payment_status !== 'UNPAID') return row;
      const { qrUrl, transferContent } = this.paymentService.generateQRCode({
        amount: row.total_amount, roomNumber: row.room_number, invoiceId: row.id,
      });
      return { ...row, qr_url: qrUrl, transfer_content: transferContent };
    });
  }

  async markPaid(invoiceId: string) {
    const affected = await this.invoiceRepository.markPaid(invoiceId);
    if (affected === 0) throw new NotFoundException('Không tìm thấy hóa đơn.');
  }

  handleBankWebhook(payload: { content: string; amount?: number }) {
    return this.paymentService.processBankWebhook(payload);
  }
}
