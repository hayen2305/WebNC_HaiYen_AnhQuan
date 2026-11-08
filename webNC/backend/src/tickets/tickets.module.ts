import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { RoomsModule } from '../rooms/rooms.module';
import { TicketRepository } from './ticket.repository';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [RoomsModule, ContractsModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketRepository],
})
export class TicketsModule {}
