import { createHash, randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

export type ApiRole = "customer" | "worker" | "admin"

export interface UserRow {
  id: string
  phone: string
  role: ApiRole
  name: string
}

export interface BookingRow {
  id: string
  customer_id: string
  worker_id: string
  service: string
  scheduled_at: string
  amount_cents: number
  status: BookingStatus
  created_at: string
  updated_at: string
}

export type BookingStatus = "requested" | "accepted" | "in_progress" | "completed" | "confirmed" | "cancelled"

export interface AuditRow {
  id: number
  actor_id: string
  action: string
  entity_type: string
  entity_id: string
  detail: string
  created_at: string
}

export interface NotificationRow {
  id: number
  user_id: string
  booking_id: string | null
  type: string
  message: string
  read_at: string | null
  created_at: string
}

export type CaravaDatabase = DatabaseSync

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer','worker','admin')),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  worker_id TEXT NOT NULL REFERENCES users(id),
  service TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('requested','accepted','in_progress','completed','confirmed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  booking_id TEXT REFERENCES bookings(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`

export const seedUsers: UserRow[] = [
  { id: "usr-customer", phone: "+251911000001", role: "customer", name: "Mekdes Alemu" },
  { id: "usr-worker", phone: "+251911000002", role: "worker", name: "Abebe Tadesse" },
  { id: "usr-admin", phone: "+251911000003", role: "admin", name: "Carava Admin" },
]

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function newId(prefix: string) {
  return `${prefix}-${randomUUID()}`
}

export function resolveDatabasePath() {
  return process.env.CARAVA_SQLITE_PATH ?? ".data/carava.sqlite"
}

export function createDatabase(path = resolveDatabasePath()): CaravaDatabase {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(schema)
  const insert = db.prepare("INSERT OR IGNORE INTO users (id, phone, role, name, created_at) VALUES (?, ?, ?, ?, ?)")
  const now = new Date().toISOString()
  for (const user of seedUsers) insert.run(user.id, user.phone, user.role, user.name, now)
  return db
}

let database: CaravaDatabase | null = null

export function getDatabase() {
  if (!database) database = createDatabase()
  return database
}

export function resetDatabaseForTests() {
  database?.close()
  database = null
}
