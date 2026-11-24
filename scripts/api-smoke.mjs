const base = process.env.CARAVA_SMOKE_BASE_URL ?? "http://127.0.0.1:3000"

async function request(path, { method = "GET", body, cookie } = {}) {
  const headers = {}
  if (body !== undefined) headers["content-type"] = "application/json"
  if (cookie) headers.cookie = cookie
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }
  return { response, payload }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

async function signIn(phone) {
  const challenge = await request("/api/v1/auth/otp/request", { method: "POST", body: { phone } })
  expect(challenge.response.ok, `OTP request failed: ${JSON.stringify(challenge.payload)}`)
  expect(/^\d{6}$/.test(challenge.payload.devOtp ?? ""), "Dev OTP was not returned. Set CARAVA_EXPOSE_DEV_OTP=true for a production server.")
  const verified = await request("/api/v1/auth/otp/verify", { method: "POST", body: { phone, code: challenge.payload.devOtp } })
  expect(verified.response.ok, `OTP verify failed: ${JSON.stringify(verified.payload)}`)
  const cookie = (verified.response.headers.get("set-cookie") ?? "").split(";")[0]
  expect(Boolean(cookie), "Session cookie was not returned")
  return { cookie, user: verified.payload.user }
}

const health = await request("/api/v1/health")
expect(health.response.status === 200, "Health check failed")
console.log(`health ok=${health.payload.ok} mode=${health.payload.mode} database=${health.payload.database} users=${health.payload.users}`)

const unauth = await request("/api/v1/bookings")
expect(unauth.response.status === 401, "Unauthenticated bookings request was not rejected")
console.log(`unauth bookings=${unauth.response.status}`)

const customer = await signIn("+251911000001")
const worker = await signIn("+251911000002")
const admin = await signIn("+251911000003")
expect(customer.user.role === "customer", "Customer role mismatch")
expect(worker.user.role === "worker", "Worker role mismatch")
expect(admin.user.role === "admin", "Admin role mismatch")
console.log("auth sessions customer/worker/admin=3")

const created = await request("/api/v1/bookings", {
  method: "POST",
  cookie: customer.cookie,
  body: {
    workerId: "usr-worker",
    service: "Smoke test repair",
    scheduledAt: "2026-11-24T10:00:00+03:00",
    amountCents: 90000,
  },
})
expect(created.response.status === 201, `Booking create failed: ${JSON.stringify(created.payload)}`)
const id = created.payload.booking.id
console.log(`create ${id} ${created.payload.booking.status}`)

for (const action of ["accept", "start", "complete"]) {
  const result = await request(`/api/v1/bookings/${id}/transition`, { method: "POST", cookie: worker.cookie, body: { action } })
  expect(result.response.ok, `${action} failed: ${JSON.stringify(result.payload)}`)
  console.log(`${action} ${result.payload.booking.status}`)
}

const confirmed = await request(`/api/v1/bookings/${id}/transition`, { method: "POST", cookie: customer.cookie, body: { action: "confirm" } })
expect(confirmed.response.ok, `confirm failed: ${JSON.stringify(confirmed.payload)}`)
console.log(`confirm ${confirmed.payload.booking.status}`)

const adminBookings = await request("/api/v1/bookings", { cookie: admin.cookie })
expect(adminBookings.response.ok, "Admin bookings list failed")
console.log(`admin bookings=${adminBookings.payload.bookings.length}`)

const auditLogs = await request("/api/v1/audit-logs", { cookie: admin.cookie })
expect(auditLogs.response.ok, "Audit logs failed")
console.log(`audit logs=${auditLogs.payload.auditLogs.length}`)

const notifications = await request("/api/v1/notifications", { cookie: worker.cookie })
expect(notifications.response.ok, "Notifications failed")
console.log(`worker notifications=${notifications.payload.notifications.length}`)

const forbidden = await request("/api/v1/audit-logs", { cookie: worker.cookie })
expect(forbidden.response.status === 403, "Worker audit access was not rejected")
console.log(`worker audit-logs=${forbidden.response.status}`)

for (const path of ["/", "/search", "/worker", "/business", "/admin", "/workers/abebe-tadesse", "/jobs/job-1", "/does-not-exist"]) {
  const result = await request(path)
  console.log(`${path} ${result.response.status}`)
}
