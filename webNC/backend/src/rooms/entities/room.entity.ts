export type RoomStatus = 'EMPTY' | 'RENTED' | 'MAINTENANCE';

export interface Room {
  id: number;
  room_number: string;
  floor: number;
  /** Giá thuê theo tháng (cột monthly_price, trả về với tên `price`). */
  price: number;
  daily_price: number | null;
  /** Đơn giá ngày hiệu lực = daily_price hoặc giá tháng / 30. */
  daily_rate: number;
  area: number | null;
  status: RoomStatus;
  description: string | null;
  image_url: string | null;
  /** Suy ra từ hợp đồng ACTIVE (JOIN), không lưu trong bảng rooms. */
  current_contract_id: number | null;
  tenant_name: string | null;
  end_date: string | null;
  /** Số yêu cầu thuê đang chờ duyệt. */
  pending_requests?: number;
}
