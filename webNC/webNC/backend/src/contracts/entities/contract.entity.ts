export interface Contract {
  id: number;
  room_id: number;
  tenant_id: number;
  room_number: string;
  tenant_name: string;
  tenant_phone: string;
  deposit: number;
  electricity_rate: number;
  water_rate: number;
  service_fee: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED';
  created_at: string;
}
