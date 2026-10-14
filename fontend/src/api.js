const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'access_token';
export const AUTH_LOGOUT_EVENT = 'auth/logout';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
    if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Không nhận được access token hợp lệ.');
    }

    localStorage.setItem(TOKEN_KEY, token);
};

export async function login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error('Email hoặc mật khẩu không đúng.');
    }

    const data = await response.json();
    setToken(data.access_token);
    return data;
}

export async function fetchStudents() {
    const token = getToken();
    const response = await fetch(`${API_URL}/sinhvien`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (response.status === 401) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        throw new Error(`Không tải được dữ liệu (HTTP ${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}
