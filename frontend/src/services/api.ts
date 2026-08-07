const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ── Token & session helpers ───────────────────────────────────────────────

const TOKEN_KEY = 'jwt_token';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('token_expires_at');
}

/**
 * Decodes the JWT payload and checks if it is expired — no network call needed.
 * Returns true when the token is missing or has expired.
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  try {
    const payloadBase64 = token.split('.')[1];
    const decoded = JSON.parse(atob(payloadBase64));
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/** Returns true when a valid, non-expired JWT token is present. */
export function isAuthenticated(): boolean {
  return !isTokenExpired();
}

// ── Auth headers helper ───────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

/**
 * Wraps fetch — attaches Bearer token, redirects to /login on 401,
 * and converts network errors into descriptive messages.
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new Error(
      'Unable to connect to the server. Please check your network connection or try again later.'
    );
  }

  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.location.href = '/login';
  }

  return res;
}

// ── Authentication ────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  name: string;
  email: string;
  role: string;
  expiresAt: number;
}

/** Register a new account. On success, stores the JWT and user info. */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
  } catch {
    throw new Error(
      'Unable to connect to the server. Please check your network connection or try again later.'
    );
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Registration failed. Please try again.');
  }

  const data: LoginResponse = await res.json();
  _storeSession(data);
  return data;
}

/** Login with email + password. On success, stores the JWT and user info. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      'Unable to connect to the server. Please check your network connection or try again later.'
    );
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid email or password');
  }

  const data: LoginResponse = await res.json();
  _storeSession(data);
  return data;
}

/** Request password reset email */
export async function forgotPassword(email: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error('Unable to connect to the server. Please check your network connection or try again later.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to request password reset.');
  }
  return data.message || 'If an account exists, a password reset link has been sent.';
}

/** Reset password using valid reset token */
export async function resetPassword(token: string, newPassword: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
  } catch {
    throw new Error('Unable to connect to the server. Please check your network connection or try again later.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password.');
  }
  return data.message || 'Password reset successfully.';
}

function _storeSession(data: LoginResponse): void {
  saveToken(data.token);
  localStorage.setItem('user_name', data.name);
  localStorage.setItem('user_email', data.email);
  localStorage.setItem('user_role', data.role);
  localStorage.setItem('token_expires_at', String(data.expiresAt));
}

// ── DTO Types ─────────────────────────────────────────────────────────────

export interface GatePassDTO {
  id?: string | number;
  passNo?: number;
  date?: string;
  partyName: string;
  vehicleNumber: string;
  materials: string;
  time: string;
  timePeriod: 'AM' | 'PM' | string;
  loadWeight: number;
  emptyWeight: number;
  netWeight?: number;
  netTons?: number;
  villageName?: string;
  gatePassSignature?: string;
  createdAt?: string;
}

export interface DashboardRevenueItem {
  label: string;
  val1: number;
  val2: number;
}

export interface DashboardOrderItem {
  label: string;
  current: number;
  previous: number;
  tons: number;
}

export interface DashboardStats {
  year: number;
  totalPasses: number;
  totalTons: number;
}

// ── Gate Pass API calls ───────────────────────────────────────────────────

export async function fetchGatePasses(q: string = '', date: string = ''): Promise<GatePassDTO[]> {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (date) params.append('date', date);

  const url = `${API_BASE}/gatepasses/search?${params.toString()}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch gate passes: ${res.statusText}`);
  return res.json();
}

export async function fetchNextPassNo(): Promise<number> {
  const res = await apiFetch(`${API_BASE}/gatepasses/next-no`);
  if (!res.ok) throw new Error(`Failed to fetch next pass number: ${res.statusText}`);
  const data = await res.json();
  return data.nextPassNo;
}

export async function createGatePass(pass: GatePassDTO): Promise<GatePassDTO> {
  const res = await apiFetch(`${API_BASE}/gatepasses`, {
    method: 'POST',
    body: JSON.stringify(pass),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create gate pass: ${res.statusText}`);
  }
  return res.json();
}

export async function updateGatePass(id: string | number, pass: GatePassDTO): Promise<GatePassDTO> {
  const res = await apiFetch(`${API_BASE}/gatepasses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pass),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update gate pass: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteGatePass(id: string | number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/gatepasses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete gate pass: ${res.statusText}`);
}

/** Preview: count how many gate passes exist for a party (with optional date range DD/MM/YYYY). */
export async function countGatePassesByParty(
  partyName: string,
  startDate = '',
  endDate = ''
): Promise<number> {
  const params = new URLSearchParams({ partyName });
  if (startDate) params.append('startDate', startDate);
  if (endDate)   params.append('endDate', endDate);
  const res = await apiFetch(`${API_BASE}/gatepasses/by-party/count?${params.toString()}`);
  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error || `Failed to count gate passes (${res.status})`);
  }
  const data = await res.json();
  return data.count as number;
}

/** Bulk delete all gate passes for a party (with optional date range DD/MM/YYYY). Returns count deleted. */
export async function deleteGatePassesByParty(
  partyName: string,
  startDate = '',
  endDate = ''
): Promise<number> {
  const params = new URLSearchParams({ partyName });
  if (startDate) params.append('startDate', startDate);
  if (endDate)   params.append('endDate', endDate);
  const res = await apiFetch(`${API_BASE}/gatepasses/by-party?${params.toString()}`, { method: 'DELETE' });
  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error || `Failed to delete gate passes (${res.status})`);
  }
  const data = await res.json();
  return data.deleted as number;
}

// ── Dashboard API calls ───────────────────────────────────────────────────

export async function fetchDashboardRevenue(
  month?: string,
  year?: number,
  startDate?: string,
  endDate?: string
): Promise<DashboardRevenueItem[]> {
  const params = new URLSearchParams();
  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else {
    if (month) params.append('month', month);
    if (year) params.append('year', String(year));
  }

  const res = await apiFetch(`${API_BASE}/dashboard/revenue?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard revenue: ${res.statusText}`);
  return res.json();
}

export async function fetchDashboardOrders(year?: number): Promise<DashboardOrderItem[]> {
  const params = new URLSearchParams();
  if (year) params.append('year', String(year));

  const res = await apiFetch(`${API_BASE}/dashboard/orders?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard orders: ${res.statusText}`);
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`);
  return res.json();
}

// ── Vehicle Analytics API calls ───────────────────────────────────────────

export interface VehicleSummaryDTO {
  vehicleNumber: string;
  totalTrips: number;
  totalWeightKg: number;
  totalTons: number;
  lastDispatchDate: string;
  materialBreakdownTons: Record<string, number>;
  recentDispatches: GatePassDTO[];
}

export async function fetchVehicleSummaries(
  startDate: string = '',
  endDate: string = '',
  q: string = ''
): Promise<VehicleSummaryDTO[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (q) params.append('q', q);

  const res = await apiFetch(`${API_BASE}/gatepasses/vehicles/summary?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch vehicle summaries: ${res.statusText}`);
  return res.json();
}
