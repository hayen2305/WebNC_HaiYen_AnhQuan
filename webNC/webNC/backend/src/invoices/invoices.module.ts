import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { RoomsModule } from '../rooms/rooms.module';
import { InvoiceRepository } from './invoice.repository';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentService } from './payment.service';
import { ReminderService } from './reminder.service';

@Module({
  imports: [ContractsModule, RoomsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceRepository, PaymentService, ReminderService],
})
export class InvoicesModule {}
