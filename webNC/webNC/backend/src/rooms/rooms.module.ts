import { Module } from '@nestjs/common';
import { RoomRepository } from './room.repository';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomRepository],
  exports: [RoomRepository],
})
export class RoomsModule {}
