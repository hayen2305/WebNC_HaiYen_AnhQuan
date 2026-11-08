import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({ default: { post: vi.fn() } }));
import api from '../api/axios';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const admin = { id: 1, role: 'ADMIN', full_name: 'Admin' };

describe('AuthContext', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('khởi tạo chưa đăng nhập', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('khôi phục phiên từ localStorage', () => {
    localStorage.setItem('user', JSON.stringify(admin));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toEqual(admin);
    expect(result.current.isAdmin).toBe(true);
  });

  it('login lưu token + user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('TOK', admin));
    expect(localStorage.getItem('token')).toBe('TOK');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(admin);
    expect(result.current.isAdmin).toBe(true);
  });

  it('login không có token (cookie) vẫn lưu user, không ghi token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login(undefined, admin));
    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.user).toEqual(admin);
  });

  it('updateUser gộp thông tin mới và đồng bộ localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('T', { id: 2, role: 'TENANT', full_name: 'A', phone: '1' }));
    act(() => result.current.updateUser({ full_name: 'B' }));
    expect(result.current.user).toEqual({ id: 2, role: 'TENANT', full_name: 'B', phone: '1' });
    expect(JSON.parse(localStorage.getItem('user')).full_name).toBe('B');
    expect(result.current.isAdmin).toBe(false);
  });

  it('logout xóa phiên', async () => {
    api.post.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('T', admin));
    await act(() => result.current.logout());
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logout vẫn xóa phiên cục bộ khi gọi API lỗi', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.post.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login('T', admin));
    await act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
