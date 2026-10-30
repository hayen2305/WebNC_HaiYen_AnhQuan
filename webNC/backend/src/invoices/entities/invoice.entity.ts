export interface InvoiceRow {
  id: number;
  contract_id: number;
  room_id: number;
  tenant_id: number;
  room_number: string;
  tenant_name: string;
  rental_type: 'MONTHLY' | 'DAILY';
  month: number;
  year: number;
  room_fee: number;
  /** TIỀN điện (VNĐ) — cột electricity_fee. */
  electricity: number;
  /** TIỀN nước (VNĐ) — cột water_fee. */
  water: number;
  other_fee: number;
  /** Cột tự tính trong DB = room_fee + electricity_fee + water_fee + other_fee. */
  total_amount: number;
  payment_status: 'UNPAID' | 'PAID';
  paid_at: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
  due_date: string;
  bill_file_url: string | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
}

export interface InvoiceCalcInput {
  roomPrice: number | string;
  /** Tiền điện (VNĐ) */
  electricity: number;
  /** Tiền nước (VNĐ) */
  water: number;
  /** Phụ phí khác (VNĐ) */
  otherFee?: number;
}

/** Công thức tính tổng hóa đơn (chỉ để hiển thị trước; DB tự tính total_amount). */
export class Invoice {
  static calculate({ roomPrice, electricity, water, otherFee = 0 }: InvoiceCalcInput) {
    const roomFee = Number(roomPrice);
    const totalAmount = roomFee + electricity + water + otherFee;
    return { roomFee, electricity, water, otherFee, totalAmount };
  }
}
