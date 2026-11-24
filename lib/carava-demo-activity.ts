"use client"

import { useMemo } from "react"
import type { Locale } from "./carava-data"
import { translateText } from "./carava-i18n"
import { createDemoId } from "./carava-workflows"
import { readDemoStorageSnapshot, useDemoStorageState, writeDemoStorageSnapshot } from "./use-demo-storage-state"

export type DemoRole = "account" | "worker" | "business" | "admin"

export type DemoNotification = {
  id: string
  audience: DemoRole[]
  title: string
  detail?: string
  read?: boolean
  createdAt: string
}

export const notificationStorageKey = "carava-demo-notifications"

const seedNotifications: DemoNotification[] = [
  { id: "NT-302", audience: ["account"], title: "Your booking with Abebe is confirmed for Nov 24.", detail: "Demo booking update", read: false, createdAt: "2026-11-22T09:40:00.000Z" },
  { id: "NT-298", audience: ["account"], title: "Sara Mekonnen replied to your service request.", detail: "Demo message", read: true, createdAt: "2026-11-22T07:40:00.000Z" },
  { id: "NT-286", audience: ["account"], title: "New worker profiles are available in your saved categories.", detail: "Demo discovery update", read: true, createdAt: "2026-11-22T06:40:00.000Z" },
  { id: "NT-290", audience: ["worker"], title: "A customer shortlisted your application.", detail: "Demo application update", read: false, createdAt: "2026-11-21T16:10:00.000Z" },
]

function readStoredNotifications(): DemoNotification[] {
  const stored = readDemoStorageSnapshot(notificationStorageKey, seedNotifications)
  return Array.isArray(stored) && stored.every((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string" && Array.isArray(item.audience)) ? stored : seedNotifications
}

/** Add a notification to the shared browser-local demo inbox. */
export function publishDemoNotification(audience: DemoRole | DemoRole[], title: string, detail = "") {
  if (typeof window === "undefined" || !title.trim()) return
  const targets = Array.isArray(audience) ? audience : [audience]
  const next: DemoNotification[] = [
    { id: createDemoId("NT"), audience: targets, title: title.trim(), detail: detail.trim() || undefined, read: false, createdAt: new Date().toISOString() },
    ...readStoredNotifications(),
  ].slice(0, 100)
  writeDemoStorageSnapshot(notificationStorageKey, next)
}

export function useDemoNotifications(role: DemoRole, locale: Locale) {
  const [notifications, setNotifications] = useDemoStorageState<DemoNotification[]>(notificationStorageKey, seedNotifications)
  const visible = useMemo(() => notifications.filter((item) => item.audience.includes(role)), [notifications, role])
  const localized = useMemo(() => visible.map((item) => ({
    ...item,
    displayTitle: locale === "en" ? item.title : translateNotification(item.title, locale),
    time: relativeTime(item.createdAt, locale),
  })), [visible, locale])
  return { notifications: localized, setNotifications, unreadCount: localized.filter((item) => !item.read).length }
}

function translateNotification(title: string, locale: Locale) {
  // Notification titles are assembled from shared, translated workflow phrases.
  // Unknown strings stay in their original form rather than showing a fake translation.
  return translateText(locale, title)
}

function relativeTime(createdAt: string, locale: Locale) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return locale === "om" ? "Beeksisa agarsiisaa" : locale === "am" ? "የማሳያ ማሳወቂያ" : "Demo notification"
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (locale === "om") {
    if (minutes < 1) return "Amma"
    if (minutes < 60) return `${minutes} daqiiqaa dura`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} sa'aatii dura`
    return `${Math.round(hours / 24)} guyyaa dura`
  }
  if (minutes < 1) return locale === "en" ? "Just now" : "አሁን"
  if (minutes < 60) return locale === "en" ? `${minutes} minutes ago` : `${minutes} ደቂቃዎች በፊት`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return locale === "en" ? `${hours} hours ago` : `${hours} ሰዓታት በፊት`
  const days = Math.round(hours / 24)
  return locale === "en" ? `${days} days ago` : `${days} ቀናት በፊት`
}

export type DemoInboxMessage = {
  id: string
  threadId: string
  authorRole: DemoRole | "public"
  author: string
  subject: string
  body: string
  sentAt: string
}

export const inboxStorageKey = "carava-demo-inbox"

const seedInbox: DemoInboxMessage[] = [
  { id: "MSG-001", threadId: "workspace-account", authorRole: "public", author: "Sara Mekonnen", subject: "Service request", body: "Would Saturday morning work to talk through your request?", sentAt: "2026-11-22T07:42:00.000Z" },
]

/** Send a message to one or more browser-local demo workspaces. */
export function sendDemoInboxMessage(threads: DemoRole[], author: string, body: string, authorRole: DemoInboxMessage["authorRole"] = "public", subject = "Demo message") {
  if (typeof window === "undefined" || !body.trim()) return
  const stored = readDemoStorageSnapshot(inboxStorageKey, [] as DemoInboxMessage[])
  const previous = Array.isArray(stored) ? stored : []
  const next = threads.map((thread) => ({
    id: createDemoId("MSG"), threadId: `workspace-${thread}`, authorRole, author, subject, body: body.trim(), sentAt: new Date().toISOString(),
  }))
  writeDemoStorageSnapshot(inboxStorageKey, [...previous, ...next])
}

export function useDemoInbox(role: DemoRole) {
  const [messages, setMessages] = useDemoStorageState<DemoInboxMessage[]>(inboxStorageKey, seedInbox)
  const threadId = `workspace-${role}`
  const visible = useMemo(() => messages.filter((item) => item.threadId === threadId), [messages, threadId])
  return { messages: visible, setMessages, threadId }
}

export function sendDemoSupportMessage(name: string, email: string, body: string) {
  if (typeof window === "undefined") return
  const key = "carava-demo-support-inbox"
  type ContactRecord = { id: string; name: string; email: string; body: string; sentAt: string; status: string }
  const stored = readDemoStorageSnapshot(key, [] as ContactRecord[])
  const previous = Array.isArray(stored) ? stored : []
  writeDemoStorageSnapshot(key, [{ id: createDemoId("SUP"), name, email, body, sentAt: new Date().toISOString(), status: "Open" }, ...previous])
  publishDemoNotification("admin", `New contact message from ${name}`, body.slice(0, 120))
}
