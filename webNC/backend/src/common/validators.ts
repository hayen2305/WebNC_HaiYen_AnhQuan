import { httpError } from './http-error';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[0-9+\s().-]{8,20}$/;

/** Kiểm tra & chuẩn hóa các trường hồ sơ (chỉ trường nào được gửi lên). */
export function profileFields(body: any = {}) {
  const f: { full_name?: string; email?: string; phone?: string } = {};
  if (body.full_name !== undefined) {
    const v = String(body.full_name).trim();
    if (!v || v.length > 100) throw httpError(400, 'Họ tên không được để trống và tối đa 100 ký tự.');
    f.full_name = v;
  }
  if (body.email !== undefined) {
    const v = String(body.email).trim();
    if (!EMAIL_RE.test(v) || v.length > 100) throw httpError(400, 'Email không hợp lệ.');
    f.email = v;
  }
  if (body.phone !== undefined) {
    const v = String(body.phone).trim();
    if (!PHONE_RE.test(v)) throw httpError(400, 'Số điện thoại không hợp lệ.');
    f.phone = v;
  }
  return f;
}
