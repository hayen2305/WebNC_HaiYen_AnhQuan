export class CreateRoomDto {
  room_number: string;
  floor: number;
  price: number;
  area?: number;
  description?: string;
}

export class UpdateRoomDto {
  room_number?: string;
  floor?: number;
  price?: number;
  area?: number;
  status?: 'EMPTY' | 'RENTED' | 'MAINTENANCE';
  description?: string;
}

export class RoomQueryDto {
  status?: string;
  search?: string;
}
