export class CreateContractDto {
  room_id: number;
  tenant_id: number;
  tenant_phone?: string;
  deposit: number;
  electricity_rate: number;
  water_rate: number;
  service_fee?: number;
  start_date: string;
  end_date: string;
}
