const API_URL = 'http://localhost:4000/api';

export type Inquiry = {
  id: number;
  customer_name: string;
  customer_contact: string;
  subject: string;
  description: string;
  status: 'New' | 'In Progress' | 'Resolved';
  owner_id: number;
  created_at: string;
  updated_at: string;
};

export type User = { id: number; email: string; name: string };

// Thrown for any non-2xx response so the UI can react to status + details
export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setSession(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your connection.', null);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Expired or invalid token: clear the session so the app sends the user to login
    if (res.status === 401 && path !== '/auth/login') clearSession();
    throw new ApiError(res.status, data?.error || 'Something went wrong', data);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  listInquiries: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<{ inquiries: Inquiry[] }>(`/inquiries${suffix}`);
  },

  getInquiry: (id: string | number) =>
    request<{ inquiry: Inquiry }>(`/inquiries/${id}`),

  createInquiry: (data: {
    customer_name: string;
    customer_contact: string;
    subject: string;
    description: string;
  }) =>
    request<{ inquiry: Inquiry }>('/inquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changeStatus: (id: number, status: string, updated_at: string) =>
    request<{ inquiry: Inquiry }>(`/inquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, updated_at }),
    }),
};