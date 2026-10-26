export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
