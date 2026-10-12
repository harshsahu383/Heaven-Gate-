
const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
).replace(/\/+$/, '');

export function getToken() {
    return sessionStorage.getItem('carepath_token');
}

export function saveToken(token) {
    sessionStorage.setItem('carepath_token', token);
}

export function clearToken() {
    sessionStorage.removeItem('carepath_token');
}

export async function apiRequest(path, options = {}) {
    const token = getToken();

    const headers = {
        Accept: 'application/json',
        ...options.headers,
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            result.message || `Request failed: ${response.status}`
        );

        error.status = response.status;
        throw error;
    }

    return result;
}

export async function login(email, password) {
    const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (!result.success || !result.token) {
        throw new Error('Login failed.');
    }

    saveToken(result.token);
    return result.user;
}
