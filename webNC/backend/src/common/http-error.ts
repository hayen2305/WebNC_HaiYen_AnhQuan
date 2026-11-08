import { HttpException } from '@nestjs/common';

/** Tạo lỗi có mã HTTP (AllExceptionsFilter trả { message } đúng status). */
export function httpError(status: number, message: string) {
  return new HttpException(message, status);
}
