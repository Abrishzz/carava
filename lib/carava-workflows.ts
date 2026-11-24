import type { ApplicationRecord, BookingStatus, DemoBooking, Locale } from "./carava-data"

const allowedBookingTransitions: Record<BookingStatus, BookingStatus[]> = {
  Requested: ["Confirmed", "Cancelled", "Reschedule requested"],
  Confirmed: ["In progress", "Cancelled", "Reschedule requested"],
  "In progress": ["Completion submitted"],
  "Completion submitted": ["Completed"],
  "Reschedule requested": ["Confirmed", "Cancelled"],
  Completed: [],
  Cancelled: [],
}

export function createDemoId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${randomId}`
}

export function canTransitionBooking(status: BookingStatus, nextStatus: BookingStatus) {
  return allowedBookingTransitions[status].includes(nextStatus)
}

export function transitionBooking(booking: DemoBooking, nextStatus: BookingStatus, update: Partial<Pick<DemoBooking, "date" | "schedule" | "details" | "completionEvidence">> = {}): DemoBooking | null {
  if (!canTransitionBooking(booking.status, nextStatus)) return null
  return { ...booking, ...update, status: nextStatus }
}

const allowedApplicationTransitions: Record<ApplicationRecord["stage"], ApplicationRecord["stage"][]> = {
  submitted: ["review", "shortlisted", "declined"],
  review: ["shortlisted", "declined"],
  shortlisted: ["interview", "selected", "declined"],
  interview: ["selected", "declined"],
  selected: [],
  declined: [],
}

export function canTransitionApplication(stage: ApplicationRecord["stage"], nextStage: ApplicationRecord["stage"]) {
  return allowedApplicationTransitions[stage].includes(nextStage)
}

export function transitionApplication(application: ApplicationRecord, nextStage: ApplicationRecord["stage"]): ApplicationRecord | null {
  if (!canTransitionApplication(application.stage, nextStage)) return null
  return { ...application, stage: nextStage }
}

export interface ScheduleOption {
  value: string
  label: string
  weekday: string
  day: string
}

export function getScheduleOptions(startDate = new Date(), days = 7, locale: Locale = "en"): ScheduleOption[] {
  const dateFormatter = new Intl.DateTimeFormat(locale === "am" ? "am-ET" : locale === "om" ? "om-ET" : "en-ET", { weekday: "short", month: "short", day: "numeric" })
  const weekdayFormatter = new Intl.DateTimeFormat(locale === "am" ? "am-ET" : locale === "om" ? "om-ET" : "en-ET", { weekday: "short" })
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + index + 1)
    const value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
    const label = dateFormatter.format(date)
    return { value, label, weekday: weekdayFormatter.format(date), day: String(date.getDate()) }
  })
}

export const scheduleTimes = ["09:00", "11:00", "14:00", "16:00"] as const

export function formatScheduleTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  return new Intl.DateTimeFormat("en-ET", { hour: "numeric", minute: "2-digit" }).format(new Date(2020, 0, 1, hours, minutes))
}
