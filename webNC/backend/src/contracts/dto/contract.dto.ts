export class CreateContractDto {
  room_id: number;
  tenant_id: number;
  rental_type?: 'MONTHLY' | 'DAILY';
  deposit?: number;
  start_date: string;
  /** Bỏ trống thì tính từ days (thuê ngày) hoặc months (thuê tháng). */
  end_date?: string;
  days?: number;
  months?: number;
  monthly_fee?: number;
  daily_fee?: number;
}

export class RequestRentalDto {
  room_id: number;
  rental_type: 'MONTHLY' | 'DAILY';
  start_date: string;
  days?: number;
  months?: number;
}

export class UpdateContractDto {
  deposit?: number;
  monthly_fee?: number;
  daily_fee?: number;
  /** Tên cũ của daily_fee (tương thích) */
  daily_rate?: number;
  start_date?: string;
  end_date?: string;
}

export class ApproveContractDto {
  deposit?: number;
}

export class RejectContractDto {
  admin_note?: string;
}

export class ContractQueryDto {
  status?: string;
  rental_type?: string;
  room_id?: string;
  tenant_id?: string;
}
