import { useCallback, useEffect, useState } from 'react';
import { Table, Alert, Spinner, Form, Button } from 'react-bootstrap';
import { AUTH_LOGOUT_EVENT, fetchStudents, login } from '../api';

export default function Content() {
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | auth | error
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setStudents(await fetchStudents());
      setStatus('ok');
    } catch (e) {
      setMessage(e.message);
      setStatus(e.status === 401 ? 'auth' : 'error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleLogout = () => {
      setStudents([]);
      setMessage('');
      setForm({ email: '', password: '' });
      setStatus('auth');
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, []);

  const onLogin = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main id="students" className="app-content">
      {status === 'loading' && (
        <div className="text-center p-4"><Spinner animation="border" size="sm" /> Loading...</div>
      )}

      {status === 'error' && <Alert variant="danger" className="m-3">{message}</Alert>}

      {status === 'auth' && (
        <Form onSubmit={onLogin} className="p-3 mx-auto login-form">
          <p className="mb-2">Vui lòng đăng nhập để xem danh sách sinh viên.</p>
          {message && message !== 'Unauthorized' && <Alert variant="danger">{message}</Alert>}
          <Form.Control className="mb-2" type="email" placeholder="Email" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Form.Control className="mb-2" type="password" placeholder="Mật khẩu" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit">Đăng nhập</Button>
        </Form>
      )}

      {status === 'ok' && (
        <Table bordered striped hover responsive className="mb-0">
          <thead>
            <tr><th>Name</th><th>ID</th><th>Status</th></tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted">No students found.</td></tr>
            ) : students.map((s) => (
              <tr key={s.id}>
                <td>{s.ten}</td>
                <td>{s.id}</td>
                <td>Active</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </main>
  );
}
