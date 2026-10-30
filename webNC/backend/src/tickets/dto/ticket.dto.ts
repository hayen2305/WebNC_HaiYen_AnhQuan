export class CreateTicketDto {
  room_id: number;
  title?: string;
  description?: string;
  image_url?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class UpdateTicketDto {
  status?: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  admin_note?: string;
}

export class TicketQueryDto {
  status?: string;
  severity?: string;
}
