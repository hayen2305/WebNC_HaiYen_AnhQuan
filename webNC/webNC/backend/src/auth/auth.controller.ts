import {
  BadRequestException, Body, Controller, Get, HttpCode, Post, Put, Query, Res,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthUser } from '../common/auth-user';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { avatarUploadOptions } from '../common/upload/upload.options';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { email, password } = body || ({} as LoginDto);
    if (!email || !password) throw new BadRequestException('Vui lòng nhập email và mật khẩu.');

    const result = await this.authService.login(email, password);
    res.cookie('token', result.token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return result;
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { full_name, email, phone, password } = body || ({} as RegisterDto);
    if (!full_name || !email || !phone || !password) {
      throw new BadRequestException('Vui lòng nhập đầy đủ thông tin bắt buộc.');
    }
    const result = await this.authService.register(body);
    res.cookie('token', result.token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', cookieOptions());
    return { message: 'Đăng xuất thành công.' };
  }

  @Post('change-password')
  @HttpCode(200)
  @Auth()
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    const { currentPassword, newPassword } = body || ({} as ChangePasswordDto);
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
    }
    await this.authService.changePassword(user.id, currentPassword, newPassword);
    return { message: 'Đổi mật khẩu thành công.' };
  }

  @Put('avatar')
  @Auth()
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  async uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh đại diện.');
    const updated = await this.authService.uploadAvatar(user.id, file.buffer);
    return { user: updated, message: 'Cập nhật ảnh đại diện thành công.' };
  }

  @Get('tenant-lookup')
  @Auth('ADMIN')
  lookupTenant(@Query('keyword') keyword?: string) {
    if (!keyword) throw new BadRequestException('Vui lòng nhập email hoặc số điện thoại.');
    return this.authService.lookupTenants(keyword);
  }
}
