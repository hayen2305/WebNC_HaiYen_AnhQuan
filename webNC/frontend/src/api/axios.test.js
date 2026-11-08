import { beforeEach, describe, expect, it } from 'vitest';
import api from './axios';

const reqHandler = () => api.interceptors.request.handlers[0].fulfilled;
const errHandler = () => api.interceptors.response.handlers[0].rejected;

describe('axios instance', () => {
  beforeEach(() => localStorage.clear());

  it('baseURL /api và gửi cookie', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('gắn Bearer token từ localStorage', () => {
    localStorage.setItem('token', 'abc');
    expect(reqHandler()({ headers: {} }).headers.Authorization).toBe('Bearer abc');
  });

  it('không có token -> không gắn header; không ghi đè header có sẵn', () => {
    expect(reqHandler()({ headers: {} }).headers.Authorization).toBeUndefined();
    localStorage.setItem('token', 'abc');
    expect(reqHandler()({ headers: { Authorization: 'Bearer khac' } }).headers.Authorization).toBe('Bearer khac');
  });

  it('401 -> xóa phiên và chuyển về /login', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', '{}');
    const loc = { pathname: '/admin/rooms', href: '' };
    const orig = window.location;
    delete window.location;
    window.location = loc;
    await expect(errHandler()({ response: { status: 401 } })).rejects.toBeTruthy();
    window.location = orig;
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(loc.href).toBe('/login');
  });

  it('lỗi khác 401 giữ nguyên phiên', async () => {
    localStorage.setItem('token', 't');
    await expect(errHandler()({ response: { status: 500 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBe('t');
  });
});
