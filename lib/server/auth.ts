import { randomBytes, randomInt, randomUUID } from "node:crypto"
import type { CaravaDatabase, UserRow } from "./db"
import { hashValue, newId } from "./db"
import { badRequest, conflict, forbidden, unauthorized } from "./http"

export const SESSION_COOKIE = "carava_session"

export const SESSION_TTL_SECONDS = Number(process.env.CARAVA_SESSION_TTL_SECONDS ?? 60 * 60 * 24)
const OTP_TTL_SECONDS = Number(process.env.CARAVA_OTP_TTL_SECONDS ?? 600)
const OTP_SECRET = process.env.CARAVA_OTP_SECRET ?? "carava-local-otp-secret"

function otpHash(phone: string, code: string) {
  return hashValue(`${OTP_SECRET}:${phone}:${code}`)
}

function exposeDevOtp() {
  return process.env.CARAVA_EXPOSE_DEV_OTP === "true" || process.env.NODE_ENV !== "production"
}

function userForPhone(db: CaravaDatabase, phone: string): UserRow {
  const existing = db.prepare("SELECT id, phone, role, name FROM users WHERE phone = ?").get(phone) as UserRow | undefined
  if (existing) return existing
  const user: UserRow = { id: newId("usr"), phone, role: "customer", name: "Carava member" }
  db.prepare("INSERT INTO users (id, phone, role, name, created_at) VALUES (?, ?, ?, ?, ?)").run(user.id, user.phone, user.role, user.name, new Date().toISOString())
  return user
}

export function requestOtp(db: CaravaDatabase, rawPhone: string) {
  const phone = rawPhone.trim()
  if (phone.length < 6) throw badRequest("Enter a valid phone number.")
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000
  db.prepare(`
    INSERT INTO otp_challenges (phone, code_hash, expires_at, attempts)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0
  `).run(phone, otpHash(phone, code), expiresAt)
  if (exposeDevOtp()) console.log(`[Carava dev OTP] ${phone}: ${code}`)
  return { phone, expiresAt, devOtp: exposeDevOtp() ? code : undefined }
}

export function verifyOtp(db: CaravaDatabase, rawPhone: string, code: string) {
  const phone = rawPhone.trim()
  const challenge = db.prepare("SELECT phone, code_hash, expires_at, attempts FROM otp_challenges WHERE phone = ?").get(phone) as
    | { phone: string; code_hash: string; expires_at: number; attempts: number }
    | undefined
  if (!challenge || challenge.expires_at < Date.now()) throw badRequest("That code expired. Request a new one.")
  if (challenge.attempts >= 5) throw conflict("Too many attempts. Request a new code.")
  if (challenge.code_hash !== otpHash(phone, code.trim())) {
    db.prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE phone = ?").run(phone)
    throw badRequest("That code is not correct.")
  }
  db.prepare("DELETE FROM otp_challenges WHERE phone = ?").run(phone)
  const user = userForPhone(db, phone)
  const token = `${randomUUID()}${randomBytes(16).toString("hex")}`
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    hashValue(token),
    user.id,
    expiresAt,
    new Date().toISOString(),
  )
  return { token, user, expiresAt }
}

function readToken(request: Request) {
  const authorization = request.headers.get("authorization")
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim()
  const cookies = request.headers.get("cookie") ?? ""
  const pair = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))
  return pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : null
}

export function sessionUser(db: CaravaDatabase, request: Request): UserRow | null {
  const token = readToken(request)
  if (!token) return null
  return (db.prepare(`
    SELECT u.id, u.phone, u.role, u.name
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(hashValue(token), Date.now()) as UserRow | undefined) ?? null
}

export function requireUser(db: CaravaDatabase, request: Request) {
  const user = sessionUser(db, request)
  if (!user) throw unauthorized()
  return user
}

export function requireRole(db: CaravaDatabase, request: Request, roles: UserRow["role"][]) {
  const user = requireUser(db, request)
  if (!roles.includes(user.role)) throw forbidden()
  return user
}
