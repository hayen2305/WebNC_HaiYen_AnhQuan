export interface InvoiceRow {
  id: number;
  contract_id: number;
  room_id: number;
  tenant_id: number;
  room_number: string;
  tenant_name: string;
  month: number;
  year: number;
  electricity: number;
  water: number;
  room_fee: number;
  electricity_fee: number;
  water_fee: number;
  other_fee: number;
  total_amount: number;
  payment_status: 'UNPAID' | 'PAID';
  due_date: string;
  bill_file_url: string | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  created_at: string;
}

export interface InvoiceCalcInput {
  electricity: number;
  water: number;
  roomPrice: number | string;
  electricityRate: number;
  waterRate: number;
  serviceFee?: number | string;
  otherFee?: number | string;
}

/** Công thức tính tiền hóa đơn — thuộc phạm vi entity, không phụ thuộc ai gọi. */
export class Invoice {
  static calculate({
    electricity, water, roomPrice, electricityRate, waterRate, serviceFee = 0, otherFee = 0,
  }: InvoiceCalcInput) {
    const electricityFee = electricity * electricityRate;
    const waterFee = water * waterRate;
    const totalAmount = Number(roomPrice) + electricityFee + waterFee + Number(serviceFee) + Number(otherFee);
    return { electricity, water, electricityFee, waterFee, roomFee: roomPrice, totalAmount };
  }
}
