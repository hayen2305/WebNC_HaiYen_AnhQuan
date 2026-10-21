export type RoomStatus = 'EMPTY' | 'RENTED' | 'MAINTENANCE';

export interface Room {
  id: number;
  room_number: string;
  floor: number;
  price: number;
  area: number | null;
  status: RoomStatus;
  description: string | null;
  current_contract_id: number | null;
  tenant_name: string | null;
  end_date: string | null;
}
