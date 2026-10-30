import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetActiveDto, UpdateMeDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 'me' phải khai báo TRƯỚC các route có tham số :id
  @Get('me')
  @Auth()
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Put('me')
  @Auth()
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    const updated = await this.usersService.updateMe(user.id, dto);
    return { user: updated, message: 'Cập nhật thông tin cá nhân thành công.' };
  }

  @Get()
  @Auth('ADMIN')
  list(@Query() query: UserQueryDto) {
    const { role, search } = query;
    return this.usersService.list({ role, search });
  }

  @Put(':id/active')
  @Auth('ADMIN')
  async setActive(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: SetActiveDto) {
    const active = !!dto?.is_active;
    await this.usersService.setActive(actor, id, active);
    return { message: active ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.' };
  }

  @Put(':id')
  @Auth('ADMIN')
  async update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    await this.usersService.update(actor, id, dto);
    return { message: 'Cập nhật người dùng thành công.' };
  }

  @Delete(':id')
  @Auth('ADMIN')
  async remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    await this.usersService.remove(actor, id);
    return { message: 'Đã xóa người dùng.' };
  }
}
