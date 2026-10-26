import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { TicketRepository } from './ticket.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [RoomsModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketRepository],
})
export class TicketsModule {}
