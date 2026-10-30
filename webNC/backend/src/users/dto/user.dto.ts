import type { Role } from '../../common/auth-user';

export class UpdateUserDto {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  /** Mật khẩu mới (bỏ trống = giữ nguyên) */
  password?: string;
  is_active?: boolean;
}

export class UserQueryDto {
  role?: string;
  search?: string;
}

export class SetActiveDto {
  is_active: boolean;
}

export class UpdateMeDto {
  full_name?: string;
  email?: string;
  phone?: string;
}
