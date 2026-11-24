import { describe, expect, it } from "vitest"
import { canTransitionApplication, canTransitionBooking, createDemoId, getScheduleOptions, transitionApplication, transitionBooking } from "../lib/carava-workflows"
import { dashboardRecords } from "../lib/carava-data"
import type { ApplicationRecord, DemoBooking } from "../lib/carava-data"

const booking: DemoBooking = {
  id: "BK-TEST",
  worker: "Abebe Tadesse",
  workerId: "abebe-tadesse",
  customer: "Mekdes Alemu",
  service: "Light repair",
  date: "2026-11-21",
  schedule: "09:00",
  status: "Requested",
  amount: 900,
}

const application: ApplicationRecord = {
  id: "APP-TEST",
  jobId: "job-1",
  workerId: "abebe-tadesse",
  employer: "Kora Coffee House",
  stage: "submitted",
  submittedAt: "2026-11-21T09:00:00.000Z",
}

describe("demo application workflow", () => {
  it("allows valid recruitment steps and rejects regressions or terminal changes", () => {
    expect(canTransitionApplication("submitted", "review")).toBe(true)
    expect(canTransitionApplication("submitted", "shortlisted")).toBe(true)
    expect(canTransitionApplication("shortlisted", "interview")).toBe(true)
    expect(canTransitionApplication("interview", "selected")).toBe(true)
    expect(canTransitionApplication("selected", "declined")).toBe(false)
    expect(canTransitionApplication("declined", "shortlisted")).toBe(false)
  })

  it("preserves application identity and details during a valid transition", () => {
    expect(transitionApplication(application, "review")).toMatchObject({ ...application, stage: "review" })
    expect(transitionApplication(application, "selected")).toBeNull()
  })
})

describe("demo booking workflow", () => {
  it("creates unique, namespaced demo record IDs", () => {
    const first = createDemoId("BK")
    const second = createDemoId("BK")
    expect(first).toMatch(/^BK-/)
    expect(second).toMatch(/^BK-/)
    expect(second).not.toBe(first)
  })

  it("allows only the next expected booking transitions", () => {
    expect(canTransitionBooking("Requested", "Confirmed")).toBe(true)
    expect(canTransitionBooking("Requested", "Completed")).toBe(false)
    expect(canTransitionBooking("In progress", "Completion submitted")).toBe(true)
    expect(canTransitionBooking("Completion submitted", "Completed")).toBe(true)
    expect(canTransitionBooking("Completed", "Cancelled")).toBe(false)
  })

  it("preserves booking details when a valid transition is applied", () => {
    const confirmed = transitionBooking(booking, "Confirmed")
    expect(confirmed).toMatchObject({ ...booking, status: "Confirmed" })
    expect(transitionBooking(booking, "Completed")).toBeNull()
  })

  it("creates selectable, non-native-picker dates with ISO values", () => {
    const options = getScheduleOptions(new Date(2026, 10, 20, 12), 3, "en")
    expect(options).toHaveLength(3)
    expect(options.map((option) => option.value)).toEqual(["2026-11-21", "2026-11-22", "2026-11-23"])
    expect(options.every((option) => option.label.length > 0)).toBe(true)
  })
})

describe("role-scoped dashboard records", () => {
  it("keeps admin customer, worker, and business queues scoped to their role", () => {
    expect(dashboardRecords("admin", "Customers").map((record) => record.Role)).toEqual(["customer"])
    expect(dashboardRecords("admin", "Workers").every((record) => record.Role === "worker")).toBe(true)
    expect(dashboardRecords("admin", "Businesses").every((record) => record.Role === "business")).toBe(true)
  })

  it("returns contextual sample records for core admin management areas", () => {
    expect(dashboardRecords("admin", "Messages & support").map((record) => record.ID)).toContain("SUP-204")
    expect(dashboardRecords("admin", "Roles & permissions").map((record) => record.ID)).toContain("ROLE-RECRUITER")
    expect(dashboardRecords("admin", "Locations & service zones").map((record) => record.ID)).toContain("LOC-01")
    expect(dashboardRecords("admin", "Subscriptions").map((record) => record.ID)).toContain("SUB-031")
  })

  it("uses the provided demo bookings for booking and assignment sections", () => {
    const rows = dashboardRecords("account", "Bookings", undefined, undefined, [booking])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ ID: "BK-TEST", Name: "Light repair", Worker: "Abebe Tadesse", Status: "Requested" })
  })
})
