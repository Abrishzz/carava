import { beforeEach, describe, expect, it } from "vitest"
import { assertTransition, createBooking, listAuditLogs, listBookings, listNotifications, transitionBooking } from "../../lib/server/bookings"
import { createDatabase, type CaravaDatabase, type UserRow } from "../../lib/server/db"

describe("zero-cost booking API service", () => {
  let db: CaravaDatabase
  let customer: UserRow
  let worker: UserRow
  let admin: UserRow

  beforeEach(() => {
    process.env.CARAVA_SQLITE_PATH = ":memory:"
    process.env.CARAVA_OTP_SECRET = "booking-test-secret"
    db = createDatabase(":memory:")
    customer = db.prepare("SELECT * FROM users WHERE role = 'customer'").get() as unknown as UserRow
    worker = db.prepare("SELECT * FROM users WHERE role = 'worker'").get() as unknown as UserRow
    admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get() as unknown as UserRow
  })

  it("runs a customer-to-worker-to-customer booking flow with audit and notifications", () => {
    const booking = createBooking(db, customer, {
      workerId: worker.id,
      service: "Kitchen light repair",
      scheduledAt: "2026-11-24T10:00:00+03:00",
      amountCents: 90000,
    })
    expect(booking.status).toBe("requested")
    expect(listNotifications(db, worker)).toEqual([expect.objectContaining({ type: "booking.requested" })])

    expect(transitionBooking(db, worker, booking.id, "accept").status).toBe("accepted")
    expect(transitionBooking(db, worker, booking.id, "start").status).toBe("in_progress")
    expect(transitionBooking(db, worker, booking.id, "complete").status).toBe("completed")
    expect(transitionBooking(db, customer, booking.id, "confirm").status).toBe("confirmed")

    const logs = listAuditLogs(db, admin)
    expect(logs).toHaveLength(5)
    expect(logs.map((log) => log.action)).toEqual([
      "confirm_booking",
      "complete_booking",
      "start_booking",
      "accept_booking",
      "create_booking",
    ])
    expect(listNotifications(db, customer).length).toBeGreaterThan(0)
    expect(listNotifications(db, worker).length).toBeGreaterThan(0)
  })

  it("enforces role and state transition rules", () => {
    const booking = createBooking(db, customer, {
      workerId: worker.id,
      service: "Home clean",
      scheduledAt: "2026-11-25T09:00:00+03:00",
      amountCents: 180000,
    })
    expect(() => assertTransition("confirm", "requested", "customer")).toThrow(/cannot be confirmed/)
    expect(() => assertTransition("accept", "requested", "customer")).toThrow(/role cannot/)
    expect(() => transitionBooking(db, customer, booking.id, "accept")).toThrow(/role cannot/)
    expect(() => transitionBooking(db, worker, booking.id, "confirm")).toThrow(/role cannot/)
    expect(() => transitionBooking(db, admin, booking.id, "accept")).toThrow(/role cannot/)
  })

  it("scopes booking lists by role", () => {
    createBooking(db, customer, {
      workerId: worker.id,
      service: "First job",
      scheduledAt: "2026-11-26T09:00:00+03:00",
      amountCents: 50000,
    })
    const second = createBooking(db, customer, {
      workerId: worker.id,
      service: "Second job",
      scheduledAt: "2026-11-27T09:00:00+03:00",
      amountCents: 60000,
    })
    expect(listBookings(db, customer)).toHaveLength(2)
    expect(listBookings(db, worker)).toHaveLength(2)
    expect(listBookings(db, admin)).toHaveLength(2)
    expect(listBookings(db, customer)[0].id).toBe(second.id)
  })

  it("rejects invalid booking payloads", () => {
    expect(() => createBooking(db, worker, {
      workerId: worker.id,
      service: "Not allowed",
      scheduledAt: "2026-11-26T09:00:00+03:00",
      amountCents: 100,
    })).toThrow(/Only customers/)
    expect(() => createBooking(db, customer, {
      workerId: "missing-worker",
      service: "Missing worker",
      scheduledAt: "2026-11-26T09:00:00+03:00",
      amountCents: 100,
    })).toThrow(/available worker/)
    expect(() => createBooking(db, customer, {
      workerId: worker.id,
      service: "Bad money",
      scheduledAt: "2026-11-26T09:00:00+03:00",
      amountCents: 10.5,
    })).toThrow(/positive integer/)
  })
})
