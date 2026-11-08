import { HttpException } from '@nestjs/common';
import { profileFields } from './validators';

const status = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as HttpException).getStatus(); }
  return null;
};

describe('profileFields', () => {
  it('chỉ trả về trường được gửi lên và đã trim', () => {
    expect(profileFields({ full_name: '  An Nguyễn ', phone: ' 0901 234 567 ' }))
      .toEqual({ full_name: 'An Nguyễn', phone: '0901 234 567' });
    expect(profileFields({})).toEqual({});
    expect(profileFields(undefined)).toEqual({});
  });

  it('từ chối họ tên rỗng hoặc quá 100 ký tự', () => {
    expect(status(() => profileFields({ full_name: '   ' }))).toBe(400);
    expect(status(() => profileFields({ full_name: 'a'.repeat(101) }))).toBe(400);
  });

  it.each(['abc', 'a@b', '@x.com', 'a b@c.com'])('từ chối email %s', (email) =>
    expect(status(() => profileFields({ email }))).toBe(400));

  it('chấp nhận email hợp lệ', () =>
    expect(profileFields({ email: 'khach@mail.com' })).toEqual({ email: 'khach@mail.com' }));

  it.each(['123', 'abcdefghij', '0901-234-567-890-123-456'])('từ chối số điện thoại %s', (phone) =>
    expect(status(() => profileFields({ phone }))).toBe(400));

  it('chấp nhận số điện thoại +84', () =>
    expect(profileFields({ phone: '+84 901 234 567' }).phone).toBe('+84 901 234 567'));
});
