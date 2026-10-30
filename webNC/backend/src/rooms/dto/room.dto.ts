export class CreateRoomDto {
  room_number: string;
  floor: number;
  price: number;
  /** Giá thuê ngày (VNĐ); bỏ trống = giá tháng / 30 */
  daily_price?: number | null;
  area?: number;
  description?: string;
}

export class UpdateRoomDto {
  room_number?: string;
  floor?: number;
  price?: number;
  daily_price?: number | null;
  area?: number | null;
  status?: 'EMPTY' | 'RENTED' | 'MAINTENANCE';
  description?: string | null;
}

export class RoomQueryDto {
  status?: string;
  search?: string;
}
