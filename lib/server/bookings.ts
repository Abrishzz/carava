import type { AuditRow, BookingRow, BookingStatus, CaravaDatabase, NotificationRow, UserRow } from "./db"
import { newId } from "./db"
import { badRequest, conflict, forbidden, notFound } from "./http"

export type BookingAction = "accept" | "start" | "complete" | "confirm" | "cancel"

interface TransitionRule {
  from: BookingStatus[]
  to: BookingStatus
  roles: UserRow["role"][]
}

export const bookingTransitions: Record<BookingAction, TransitionRule> = {
  accept: { from: ["requested"], to: "accepted", roles: ["worker"] },
  start: { from: ["accepted"], to: "in_progress", roles: ["worker"] },
  complete: { from: ["in_progress"], to: "completed", roles: ["worker"] },
  confirm: { from: ["completed"], to: "confirmed", roles: ["customer"] },
  cancel: { from: ["requested", "accepted", "in_progress"], to: "cancelled", roles: ["customer", "worker", "admin"] },
}

export function assertTransition(action: string, status: BookingStatus, role: UserRow["role"]) {
  const rule = bookingTransitions[action as BookingAction]
  if (!rule) throw badRequest("Unsupported booking action.")
  if (!rule.roles.includes(role)) throw forbidden("This role cannot perform that booking action.")
  if (!rule.from.includes(status)) throw conflict(`A ${status.replaceAll("_", " ")} booking cannot be ${action === "confirm" ? "confirmed" : `${action}ed`}.`)
  return rule
}

function transaction<T>(db: CaravaDatabase, run: () => T): T {
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = run()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

function notify(db: CaravaDatabase, userId: string, bookingId: string, message: string, type: string, now: string) {
  db.prepare("INSERT INTO notifications (user_id, booking_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, bookingId, type, message, now)
}

function audit(db: CaravaDatabase, actorId: string, action: string, entityId: string, detail: string, now: string) {
  db.prepare("INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    actorId,
    action,
    "booking",
    entityId,
    detail,
    now,
  )
}

function readBooking(db: CaravaDatabase, id: string) {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as BookingRow | undefined
  if (!booking) throw notFound("Booking not found.")
  return booking
}

function authorizeBooking(actor: UserRow, booking: BookingRow) {
  if (actor.role === "customer" && booking.customer_id !== actor.id) throw forbidden("This booking belongs to another customer.")
  if (actor.role === "worker" && booking.worker_id !== actor.id) throw forbidden("This booking is not assigned to you.")
}

export interface CreateBookingInput {
  workerId: string
  service: string
  scheduledAt: string
  amountCents: number
}

export function createBooking(db: CaravaDatabase, actor: UserRow, input: CreateBookingInput) {
  if (actor.role !== "customer") throw forbidden("Only customers can create bookings.")
  const workerId = String(input.workerId ?? "").trim()
  const service = String(input.service ?? "").trim()
  const scheduledAt = String(input.scheduledAt ?? "").trim()
  const amountCents = Number(input.amountCents)
  if (!workerId || !service || !scheduledAt) throw badRequest("workerId, service, and scheduledAt are required.")
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw badRequest("amountCents must be a positive integer.")
  if (Number.isNaN(Date.parse(scheduledAt))) throw badRequest("scheduledAt must be a valid date.")
  const worker = db.prepare("SELECT id, phone, role, name FROM users WHERE id = ?").get(workerId) as UserRow | undefined
  if (!worker || worker.role !== "worker") throw badRequest("Choose an available worker.")

  const now = new Date().toISOString()
  const id = newId("bk")
  return transaction(db, () => {
    db.prepare(`
      INSERT INTO bookings (id, customer_id, worker_id, service, scheduled_at, amount_cents, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?)
    `).run(id, actor.id, worker.id, service, scheduledAt, amountCents, now, now)
    db.prepare("INSERT INTO booking_events (booking_id, actor_id, action, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id,
      actor.id,
      "create",
      "",
      "requested",
      now,
    )
    audit(db, actor.id, "create_booking", id, `${actor.name} requested ${service} with ${worker.name}.`, now)
    notify(db, worker.id, id, `New booking request: ${service}`, "booking.requested", now)
    return readBooking(db, id)
  })
}

export function transitionBooking(db: CaravaDatabase, actor: UserRow, bookingId: string, action: string) {
  const current = readBooking(db, bookingId)
  const rule = assertTransition(action, current.status, actor.role)
  authorizeBooking(actor, current)
  const now = new Date().toISOString()

  return transaction(db, () => {
    db.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").run(rule.to, now, bookingId)
    db.prepare("INSERT INTO booking_events (booking_id, actor_id, action, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      bookingId,
      actor.id,
      action,
      current.status,
      rule.to,
      now,
    )
    audit(db, actor.id, `${action}_booking`, bookingId, `${actor.name} changed ${bookingId} from ${current.status} to ${rule.to}.`, now)
    notify(db, current.customer_id, bookingId, `Booking ${bookingId} is now ${rule.to.replaceAll("_", " ")}.`, `booking.${rule.to}`, now)
    notify(db, current.worker_id, bookingId, `Booking ${bookingId} is now ${rule.to.replaceAll("_", " ")}.`, `booking.${rule.to}`, now)
    return readBooking(db, bookingId)
  })
}

export function listBookings(db: CaravaDatabase, actor: UserRow): BookingRow[] {
  if (actor.role === "customer") {
    return db.prepare("SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC, rowid DESC").all(actor.id) as unknown as BookingRow[]
  }
  if (actor.role === "worker") {
    return db.prepare("SELECT * FROM bookings WHERE worker_id = ? ORDER BY created_at DESC, rowid DESC").all(actor.id) as unknown as BookingRow[]
  }
  return db.prepare("SELECT * FROM bookings ORDER BY created_at DESC, rowid DESC").all() as unknown as BookingRow[]
}

export function listNotifications(db: CaravaDatabase, actor: UserRow): NotificationRow[] {
  return db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC").all(actor.id) as unknown as NotificationRow[]
}

export function listAuditLogs(db: CaravaDatabase, actor: UserRow): AuditRow[] {
  if (actor.role !== "admin") throw forbidden("Audit logs are admin-only.")
  return db.prepare("SELECT * FROM audit_logs ORDER BY id DESC").all() as unknown as AuditRow[]
}
