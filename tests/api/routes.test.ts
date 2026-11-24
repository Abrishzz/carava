import { beforeEach, describe, expect, it } from "vitest"
import { GET as healthGet } from "../../app/api/v1/health/route"
import { POST as requestOtp } from "../../app/api/v1/auth/otp/request/route"
import { POST as verifyOtp } from "../../app/api/v1/auth/otp/verify/route"
import { GET as listBookings, POST as createBooking } from "../../app/api/v1/bookings/route"
import { POST as transitionBooking } from "../../app/api/v1/bookings/[id]/transition/route"
import { GET as listNotifications } from "../../app/api/v1/notifications/route"
import { GET as listAuditLogs } from "../../app/api/v1/audit-logs/route"
import { resetDatabaseForTests } from "../../lib/server/db"

const customerPhone = "+251911000001"
const workerPhone = "+251911000002"
const adminPhone = "+251911000003"

function jsonRequest(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

function getRequest(path: string, cookie?: string) {
  return new Request(`http://localhost${path}`, {
    headers: cookie ? { cookie } : {},
  })
}

function sessionCookie(response: Response) {
  return (response.headers.get("set-cookie") ?? "").split(";")[0]
}

async function signIn(phone: string) {
  const challenge = await requestOtp(jsonRequest("/api/v1/auth/otp/request", { phone }))
  const { devOtp } = await challenge.json() as { devOtp: string }
  expect(devOtp).toMatch(/^\d{6}$/)
  const verified = await verifyOtp(jsonRequest("/api/v1/auth/otp/verify", { phone, code: devOtp }))
  return { cookie: sessionCookie(verified), payload: await verified.json() as { user: { role: string } } }
}

describe("zero-cost API route handlers", () => {
  beforeEach(() => {
    process.env.CARAVA_SQLITE_PATH = ":memory:"
    process.env.CARAVA_OTP_SECRET = "route-test-secret"
    process.env.CARAVA_EXPOSE_DEV_OTP = "true"
    resetDatabaseForTests()
  })

  it("exposes a health check without authentication", async () => {
    const response = await healthGet()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, database: "sqlite" })
  })

  it("runs the booking flow through HTTP handlers with role-scoped access", async () => {
    const customer = await signIn(customerPhone)
    const worker = await signIn(workerPhone)
    const admin = await signIn(adminPhone)
    expect(customer.payload.user.role).toBe("customer")
    expect(worker.payload.user.role).toBe("worker")
    expect(admin.payload.user.role).toBe("admin")

    const created = await createBooking(jsonRequest("/api/v1/bookings", {
      workerId: "usr-worker",
      service: "Kitchen light repair",
      scheduledAt: "2026-11-24T10:00:00+03:00",
      amountCents: 90000,
    }, customer.cookie))
    expect(created.status).toBe(201)
    const { booking } = await created.json() as { booking: { id: string; status: string } }
    expect(booking.status).toBe("requested")

    const accepted = await transitionBooking(
      jsonRequest(`/api/v1/bookings/${booking.id}/transition`, { action: "accept" }, worker.cookie),
      { params: Promise.resolve({ id: booking.id }) },
    )
    expect(accepted.status).toBe(200)
    await expect(accepted.json()).resolves.toMatchObject({ booking: { status: "accepted" } })

    const completed = await transitionBooking(
      jsonRequest(`/api/v1/bookings/${booking.id}/transition`, { action: "complete" }, worker.cookie),
      { params: Promise.resolve({ id: booking.id }) },
    )
    expect(completed.status).toBe(409)

    const started = await transitionBooking(
      jsonRequest(`/api/v1/bookings/${booking.id}/transition`, { action: "start" }, worker.cookie),
      { params: Promise.resolve({ id: booking.id }) },
    )
    expect(started.status).toBe(200)
    const finished = await transitionBooking(
      jsonRequest(`/api/v1/bookings/${booking.id}/transition`, { action: "complete" }, worker.cookie),
      { params: Promise.resolve({ id: booking.id }) },
    )
    expect(finished.status).toBe(200)
    const confirmed = await transitionBooking(
      jsonRequest(`/api/v1/bookings/${booking.id}/transition`, { action: "confirm" }, customer.cookie),
      { params: Promise.resolve({ id: booking.id }) },
    )
    expect(confirmed.status).toBe(200)

    const customerList = await listBookings(getRequest("/api/v1/bookings", customer.cookie))
    await expect(customerList.json()).resolves.toMatchObject({ bookings: [{ status: "confirmed" }] })

    const adminLogs = await listAuditLogs(getRequest("/api/v1/audit-logs", admin.cookie))
    const logs = await adminLogs.json() as { auditLogs: { action: string }[] }
    expect(logs.auditLogs.map((log) => log.action)).toContain("confirm_booking")

    const workerNotifications = await listNotifications(getRequest("/api/v1/notifications", worker.cookie))
    await expect(workerNotifications.json()).resolves.toMatchObject({ notifications: expect.any(Array) })
  })

  it("rejects unauthenticated and wrong-role access", async () => {
    expect((await listBookings(getRequest("/api/v1/bookings"))).status).toBe(401)
    const worker = await signIn(workerPhone)
    expect((await listAuditLogs(getRequest("/api/v1/audit-logs", worker.cookie))).status).toBe(403)
  })
})
