import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import {
  ApproveContractDto, ContractQueryDto, CreateContractDto, RejectContractDto, RequestRentalDto, UpdateContractDto,
} from './dto/contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Auth('ADMIN')
  async create(@Body() dto: CreateContractDto) {
    const id = await this.contractsService.create(dto);
    return { id, message: 'Tạo hợp đồng thành công.' };
  }

  @Get()
  @Auth('ADMIN')
  list(@Query() query: ContractQueryDto) {
    return this.contractsService.list(query);
  }

  // ---- Các route cố định phải khai báo TRƯỚC các route có tham số :id ----

  @Post('request')
  @Auth('TENANT')
  async request(@CurrentUser() user: AuthUser, @Body() dto: RequestRentalDto) {
    const id = await this.contractsService.request(user.id, dto);
    return { id, message: 'Đã gửi yêu cầu thuê phòng, vui lòng chờ chủ trọ duyệt.' };
  }

  @Get('my')
  @Auth('TENANT')
  getMyActiveContract(@CurrentUser() user: AuthUser) {
    return this.contractsService.getActiveByTenant(user.id);
  }

  @Get('mine')
  @Auth('TENANT')
  listMine(@CurrentUser() user: AuthUser) {
    return this.contractsService.listMine(user.id);
  }

  @Get('room/:roomId')
  @Auth('ADMIN')
  getActiveContractByRoom(@Param('roomId') roomId: string) {
    return this.contractsService.getActiveByRoom(roomId);
  }

  @Put(':id/cancel')
  @Auth('TENANT')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.contractsService.cancel(id, user.id);
    return { message: 'Đã hủy yêu cầu thuê phòng.' };
  }

  @Put(':id/approve')
  @Auth('ADMIN')
  async approve(@Param('id') id: string, @Body() dto: ApproveContractDto) {
    await this.contractsService.approve(id, dto);
    return { message: 'Đã duyệt yêu cầu, hợp đồng có hiệu lực.' };
  }

  @Put(':id/reject')
  @Auth('ADMIN')
  async reject(@Param('id') id: string, @Body() dto: RejectContractDto) {
    await this.contractsService.reject(id, dto?.admin_note);
    return { message: 'Đã từ chối yêu cầu.' };
  }

  @Put(':id/terminate')
  @Auth('ADMIN')
  async terminate(@Param('id') id: string) {
    await this.contractsService.terminate(id);
    return { message: 'Đã thanh lý hợp đồng, phòng chuyển về trạng thái Trống.' };
  }

  @Put(':id')
  @Auth('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    await this.contractsService.update(id, dto);
    return { message: 'Cập nhật hợp đồng thành công.' };
  }

  @Delete(':id')
  @Auth('ADMIN')
  async remove(@Param('id') id: string) {
    await this.contractsService.remove(id);
    return { message: 'Đã xóa hợp đồng.' };
  }
}
