import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = { user: null };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
import PrivateRoute from './PrivateRoute';

function renderAt(user, role) {
  auth.user = user;
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/secret" element={<PrivateRoute role={role}><p>nội dung kín</p></PrivateRoute>} />
        <Route path="/login" element={<p>trang đăng nhập</p>} />
        <Route path="/admin/rooms" element={<p>khu admin</p>} />
        <Route path="/tenant" element={<p>khu khách thuê</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PrivateRoute', () => {
  it('chưa đăng nhập -> về /login', () => {
    renderAt(null);
    expect(screen.getByText('trang đăng nhập')).toBeInTheDocument();
  });
  it('đã đăng nhập, không yêu cầu vai trò -> hiện nội dung', () => {
    renderAt({ role: 'TENANT' });
    expect(screen.getByText('nội dung kín')).toBeInTheDocument();
  });
  it('đúng vai trò -> hiện nội dung', () => {
    renderAt({ role: 'ADMIN' }, 'ADMIN');
    expect(screen.getByText('nội dung kín')).toBeInTheDocument();
  });
  it('khách vào trang admin -> chuyển về khu khách thuê', () => {
    renderAt({ role: 'TENANT' }, 'ADMIN');
    expect(screen.getByText('khu khách thuê')).toBeInTheDocument();
  });
  it('admin vào trang của khách -> chuyển về khu admin', () => {
    renderAt({ role: 'ADMIN' }, 'TENANT');
    expect(screen.getByText('khu admin')).toBeInTheDocument();
  });
});
