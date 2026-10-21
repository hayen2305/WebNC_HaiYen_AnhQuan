import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Auth('ADMIN')
  async create(@Body() dto: CreateContractDto) {
    const id = await this.contractsService.create(dto);
    return { id, message: 'Tạo hợp đồng thành công.' };
  }

  // Phải khai báo TRƯỚC các route có tham số để 'my' không bị coi là :id
  @Get('my')
  @Auth('TENANT')
  getMyActiveContract(@CurrentUser() user: AuthUser) {
    return this.contractsService.getActiveByTenant(user.id);
  }

  @Get('room/:roomId')
  @Auth('ADMIN')
  getActiveContractByRoom(@Param('roomId') roomId: string) {
    return this.contractsService.getActiveByRoom(roomId);
  }

  @Put(':id/terminate')
  @Auth('ADMIN')
  async terminate(@Param('id') id: string) {
    await this.contractsService.terminate(id);
    return { message: 'Đã thanh lý hợp đồng, phòng chuyển về trạng thái Trống.' };
  }
}
