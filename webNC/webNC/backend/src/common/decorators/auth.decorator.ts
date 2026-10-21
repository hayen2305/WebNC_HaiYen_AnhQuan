import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '../auth-user';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * @Auth()          -> chỉ cần đăng nhập
 * @Auth('ADMIN')   -> đăng nhập + đúng role (tương đương authenticate + authorize ở Express)
 */
export const Auth = (...roles: Role[]) =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
