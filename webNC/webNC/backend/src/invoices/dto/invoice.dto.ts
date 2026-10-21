export class CreateInvoiceDto {
  contract_id: number;
  month: number;
  year: number;
  electricity: number;
  water: number;
  other_fee?: number;
  due_date: string;
  bill_file_url?: string;
}

export class InvoiceQueryDto {
  status?: string;
  month?: string;
  year?: string;
}

export class BankWebhookDto {
  content: string;
  amount?: number;
}
