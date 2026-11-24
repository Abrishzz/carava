import { apiBaseUrl, demoMode, apiMode } from "./api/config"

export type ApiRole = "customer" | "worker" | "admin"
export type ApiBookingStatus = "requested" | "accepted" | "in_progress" | "completed" | "confirmed" | "cancelled"

export interface ApiUser {
  id: string
  phone: string
  role: ApiRole
  name: string
}

export interface ApiBooking {
  id: string
  customer_id: string
  worker_id: string
  service: string
  scheduled_at: string
  amount_cents: number
  status: ApiBookingStatus
  created_at: string
  updated_at: string
}

export interface ApiNotification {
  id: number
  user_id: string
  booking_id: string | null
  type: string
  message: string
  read_at: string | null
  created_at: string
}

export interface ApiAuditLog {
  id: number
  actor_id: string
  action: string
  entity_type: string
  entity_id: string
  detail: string
  created_at: string
}

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = "ApiClientError"
  }
}

export { apiMode, demoMode }

export function isApiEnabled() {
  return !demoMode
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (demoMode) throw new ApiClientError(0, "demo_mode", "The API client is disabled while demo mode is active.")
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json")
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: "include" })
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } & T | null
  if (!response.ok || payload?.error) {
    throw new ApiClientError(response.status, payload?.error?.code ?? "request_failed", payload?.error?.message ?? "The request failed.")
  }
  return payload as T
}

function post<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export const api = {
  health: () => apiFetch<{ ok: boolean; mode: string; database: string; users: number }>("/health"),
  requestOtp: (phone: string) => post<{ ok: boolean; phone: string; devOtp?: string }>("/auth/otp/request", { phone }),
  verifyOtp: (phone: string, code: string) => post<{ ok: boolean; token: string; user: ApiUser }>("/auth/otp/verify", { phone, code }),
  listBookings: () => apiFetch<{ bookings: ApiBooking[] }>("/bookings"),
  createBooking: (input: { workerId: string; service: string; scheduledAt: string; amountCents: number }) =>
    post<{ booking: ApiBooking }>("/bookings", input),
  transitionBooking: (id: string, action: string) => post<{ booking: ApiBooking }>(`/bookings/${encodeURIComponent(id)}/transition`, { action }),
  listNotifications: () => apiFetch<{ notifications: ApiNotification[] }>("/notifications"),
  listAuditLogs: () => apiFetch<{ auditLogs: ApiAuditLog[] }>("/audit-logs"),
}
