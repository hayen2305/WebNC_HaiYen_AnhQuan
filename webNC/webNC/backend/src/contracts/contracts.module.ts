import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ContractRepository } from './contract.repository';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [AuthModule, RoomsModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractRepository],
  exports: [ContractRepository],
})
export class ContractsModule {}
