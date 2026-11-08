import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ login }) }));
vi.mock('../api/axios', () => ({ default: { post: vi.fn() } }));
import api from '../api/axios';
import Login from './Login';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/rooms" element={<p>khu admin</p>} />
        <Route path="/tenant" element={<p>khu khách thuê</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('trang Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bắt buộc nhập email và mật khẩu, không gọi API khi thiếu', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập/ }));
    expect(await screen.findByText('Nhập email')).toBeInTheDocument();
    expect(screen.getByText('Nhập mật khẩu')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('đăng nhập admin -> lưu phiên và vào khu admin', async () => {
    api.post.mockResolvedValue({ data: { token: 'T', user: { id: 1, role: 'ADMIN' } } });
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'admin@local.com');
    await userEvent.type(screen.getByPlaceholderText('Mật Khẩu'), 'Admin@123');
    await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập/ }));
    await waitFor(() => expect(screen.getByText('khu admin')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'admin@local.com', password: 'Admin@123' });
    expect(login).toHaveBeenCalledWith('T', { id: 1, role: 'ADMIN' });
  });

  it('đăng nhập khách thuê -> vào khu khách', async () => {
    api.post.mockResolvedValue({ data: { token: 'T', user: { id: 2, role: 'TENANT' } } });
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText('Mật Khẩu'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập/ }));
    await waitFor(() => expect(screen.getByText('khu khách thuê')).toBeInTheDocument());
  });

  it('hiện thông báo lỗi từ server (ví dụ tài khoản bị khóa)', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Tài khoản đã bị khóa. Vui lòng liên hệ chủ trọ.' } } });
    renderPage();
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@x.com');
    await userEvent.type(screen.getByPlaceholderText('Mật Khẩu'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập/ }));
    expect(await screen.findByText(/Tài khoản đã bị khóa/)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('chuyển sang đăng ký, kiểm tra mật khẩu >= 6 ký tự và luôn gửi role TENANT', async () => {
    api.post.mockResolvedValue({ data: { token: 'T', user: { id: 3, role: 'TENANT' } } });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký ngay' }));
    await userEvent.type(screen.getByPlaceholderText('Họ và tên'), 'Bình');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'b@x.com');
    await userEvent.type(screen.getByPlaceholderText('Số điện thoại'), '0912345678');
    await userEvent.type(screen.getByPlaceholderText('Mật khẩu'), '123');
    await userEvent.click(screen.getByRole('button', { name: /Đăng Ký/ }));
    expect(await screen.findByText('Mật khẩu tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText('Mật khẩu'), '456');
    await userEvent.click(screen.getByRole('button', { name: /Đăng Ký/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/register',
      expect.objectContaining({ email: 'b@x.com', role: 'TENANT' })));
    await waitFor(() => expect(screen.getByText('khu khách thuê')).toBeInTheDocument());
  });
});
