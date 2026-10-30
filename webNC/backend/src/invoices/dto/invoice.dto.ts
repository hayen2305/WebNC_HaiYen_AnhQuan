export class CreateInvoiceDto {
  contract_id: number;
  month: number;
  year: number;
  /** Tiền điện (VNĐ) — số tiền, không phải chỉ số công tơ */
  electricity?: number;
  /** Tiền nước (VNĐ) — số tiền, không phải chỉ số công tơ */
  water?: number;
  /** Phụ phí khác (VNĐ) */
  other_fee?: number;
  due_date: string;
  bill_file_url?: string;
}

export class UpdateInvoiceDto {
  room_fee?: number;
  electricity?: number;
  water?: number;
  other_fee?: number;
  due_date?: string;
  payment_status?: 'UNPAID' | 'PAID';
  payment_method?: string;
}

export class InvoiceQueryDto {
  status?: string;
  month?: string;
  year?: string;
}

export class BankWebhookDto {
  content: string;
  amount?: number;
  transaction_ref?: string;
}

export class PayInvoiceDto {
  payment_method?: string;
}

export class TenantInvoiceQueryDto {
  /** YYYY-MM */
  from?: string;
  to?: string;
}
