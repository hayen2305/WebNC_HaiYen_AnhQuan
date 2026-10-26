export class CreateTicketDto {
  room_id: number;
  title?: string;
  description?: string;
  image_url?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class UpdateTicketStatusDto {
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}

export class TicketQueryDto {
  status?: string;
  severity?: string;
}
