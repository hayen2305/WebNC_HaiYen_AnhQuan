export type RentalType = 'MONTHLY' | 'DAILY';
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';

/** Hợp đồng và yêu cầu thuê phòng dùng chung một bảng; phòng/khách lấy qua JOIN. */
export interface Contract {
  id: number;
  tenant_id: number;
  room_id: number;
  monthly_fee: number;
  daily_fee: number;
  /** Bí danh của daily_fee để FE giữ nguyên tên trường. */
  daily_rate: number;
  deposit: number;
  start_date: string;
  end_date: string;
  rental_type: RentalType;
  status: ContractStatus;
  admin_note: string | null;
  decided_at: string | null;
  created_at: string;
  room_number: string;
  room_image: string | null;
  room_price: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string;
  days: number;
  months: number;
  estimated_total: number;
}
