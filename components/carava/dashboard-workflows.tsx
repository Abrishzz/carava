"use client"

import { useState } from "react"
import Link from "next/link"
import { useDemoStorageState } from "@/lib/use-demo-storage-state"
import { ArrowDownToLine, CalendarDays, Check, ClipboardCheck, ShieldAlert, Star, Wallet } from "lucide-react"
import { businessProfiles, categories, dashboardRecords, demoAuditRecords, disputeRecords, formatDate, formatETB, initialVerificationStatuses, paymentRecords, reviewRecords, workers, type ApplicationRecord, type DemoBooking, type Job, type Locale } from "@/lib/carava-data"
import { publishDemoNotification } from "@/lib/carava-demo-activity"
import { createDemoId, getScheduleOptions, scheduleTimes } from "@/lib/carava-workflows"
import { useDialogFocus } from "@/lib/use-dialog-focus"
import { t, translateText } from "@/lib/carava-i18n"

function statusText(status: DemoBooking["status"], locale: Locale) {
  const key: Record<DemoBooking["status"], Parameters<typeof t>[1]> = {
    Requested: "statusRequested",
    Confirmed: "statusConfirmed",
    "In progress": "statusInProgress",
    "Completion submitted": "statusCompletionSubmitted",
    Completed: "statusCompleted",
    Cancelled: "statusCancelled",
    "Reschedule requested": "statusRescheduleRequested",
  }
  return t(locale, key[status])
}

export function handlesWorkflowSection(role: string, section: string) {
  if (role === "account" && ["My job posts", "Applications"].includes(section)) return true
  if (role === "admin" && /support|emergency/i.test(section)) return true
  if (["Bookings", "Service requests", "Assignments"].includes(section)) return true
  if (["Payments", "Transactions", "Payouts", "Refunds"].includes(section) && role === "admin") return true
  if (["Payments", "Receipts"].includes(section) && role !== "admin") return true
  if (["Earnings", "Payouts"].includes(section) && role === "worker") return true
  if (["Reviews", "Reviews & moderation"].includes(section) && role !== "admin") return true
  if ((/complaint|dispute/i.test(section)) && (role === "account" || role === "admin")) return true
  if (role === "worker" && ["My profile", "Skills & categories", "Services & pricing", "Availability calendar", "Applications", "Invitations"].includes(section)) return true
  if (role === "business" && ["Company profile", "Company verification", "Applicants", "Candidates", "Recruitment pipeline", "Interviews", "Team members", "Team roles", "Worker assignments", "Analytics"].includes(section)) return true
  return false
}

export function DashboardWorkflow({ role, section, locale, bookings, marketplaceJobs, applications, onCreateJob, onUpdateJob, onUpdateBooking, onUpdateApplication, onToast }: {
  role: "account" | "worker" | "business" | "admin"
  section: string
  locale: Locale
  bookings: DemoBooking[]
  marketplaceJobs: Job[]
  applications: ApplicationRecord[]
  onCreateJob: (title: string, description: string, category?: string, owner?: "business" | "customer") => void
  onUpdateJob: (id: string, title: string, description: string, category?: string) => void
  onUpdateBooking: (id: string, status: DemoBooking["status"], update?: Partial<Pick<DemoBooking, "date" | "schedule" | "details" | "completionEvidence">>) => void
  onUpdateApplication: (id: string, stage: ApplicationRecord["stage"]) => void
  onToast: (message: string) => void
}) {
  if (role === "account" && ["My job posts", "Applications"].includes(section)) return <CustomerJobWorkspace section={section} locale={locale} marketplaceJobs={marketplaceJobs} applications={applications} onCreateJob={onCreateJob} onUpdateJob={onUpdateJob} onUpdateApplication={onUpdateApplication} onToast={onToast} />
  if (role === "admin" && /support|emergency/i.test(section)) return <AdminSupportWorkspace locale={locale} onToast={onToast} section={section} />
  if (["Bookings", "Service requests", "Assignments"].includes(section)) return <BookingWorkspace role={role} locale={locale} bookings={bookings} onUpdateBooking={onUpdateBooking} onToast={onToast} />
  if (["Payments", "Transactions", "Payouts", "Refunds"].includes(section) && role === "admin") return <AdminFinanceWorkspace section={section} locale={locale} bookings={bookings} onToast={onToast} />
  if (["Payments", "Receipts", "Earnings", "Payouts"].includes(section) && (role === "account" || role === "worker")) return <FinanceWorkspace role={role} locale={locale} bookings={bookings} onToast={onToast} />
  if (["Reviews", "Reviews & moderation"].includes(section) && role === "worker") return <WorkerReviewWorkspace locale={locale} bookings={bookings} onToast={onToast} />
  if (["Reviews", "Reviews & moderation"].includes(section) && role === "account") return <ReviewWorkspace locale={locale} bookings={bookings} onToast={onToast} />
  if (/complaint|dispute/i.test(section) && (role === "account" || role === "admin")) return <DisputeWorkspace role={role} locale={locale} bookings={bookings} onToast={onToast} />
  if (role === "worker" && ["My profile", "Skills & categories", "Services & pricing", "Availability calendar"].includes(section)) return <WorkerProfileWorkspace section={section} locale={locale} onToast={onToast} />
  if (role === "worker" && ["Applications", "Invitations"].includes(section)) return <WorkerOpportunities section={section} locale={locale} applications={applications} marketplaceJobs={marketplaceJobs} onToast={onToast} />
  if (role === "business" && ["Company profile", "Company verification", "Applicants", "Candidates", "Recruitment pipeline", "Interviews", "Team members", "Team roles", "Worker assignments", "Analytics"].includes(section)) return <BusinessWorkspace section={section} locale={locale} applications={applications} marketplaceJobs={marketplaceJobs} onUpdateApplication={onUpdateApplication} onToast={onToast} />
  return null
}

function CustomerJobWorkspace({ section, locale, marketplaceJobs, applications, onCreateJob, onUpdateJob, onUpdateApplication, onToast }: {
  section: string
  locale: Locale
  marketplaceJobs: Job[]
  applications: ApplicationRecord[]
  onCreateJob: (title: string, description: string, category?: string, owner?: "business" | "customer") => void
  onUpdateJob: (id: string, title: string, description: string, category?: string) => void
  onUpdateApplication: (id: string, stage: ApplicationRecord["stage"]) => void
  onToast: (message: string) => void
}) {
  const customerJobs = marketplaceJobs.filter((job) => job.company === "Mekdes Alemu")
  const customerJobIds = new Set(customerJobs.map((job) => job.id))
  const customerApplications = applications.filter((application) => customerJobIds.has(application.jobId))
  const [title, setTitle] = useState("")
  const [details, setDetails] = useState("")
  const [category, setCategory] = useState("")
  const [editingId, setEditingId] = useState("")
  const submitJob = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !category) return
    if (editingId) onUpdateJob(editingId, title.trim(), details.trim(), category)
    else onCreateJob(title.trim(), details.trim(), category, "customer")
    setTitle("")
    setDetails("")
    setCategory("")
    setEditingId("")
    onToast(translateText(locale, editingId ? "Your demo job post was sent back for review." : "Your demo job post was submitted for moderation."))
  }
  if (section === "My job posts") return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "My job posts")}</h2><p>{translateText(locale, "Post a one-time opportunity for local professionals. New posts appear to workers only after admin demo approval.")}</p></div></div><form className="workflow-form" onSubmit={submitJob}><label className="field"><span>{translateText(locale, "Job title")}</span><input maxLength={100} minLength={3} onChange={(event) => setTitle(event.target.value)} required value={title} /></label><label className="field"><span>{translateText(locale, "Category")}</span><select onChange={(event) => setCategory(event.target.value)} required value={category}><option value="">{translateText(locale, "Choose a category")}</option>{categories.flatMap((item) => item.subcategories).map((item) => <option key={item} value={item}>{translateText(locale, item)}</option>)}</select></label><label className="field"><span>{translateText(locale, "What needs to be done?")}</span><textarea maxLength={1200} onChange={(event) => setDetails(event.target.value)} required value={details} /></label><button className="button button-primary button-small" type="submit">{translateText(locale, editingId ? "Save job post" : "Submit job post for review")}</button></form><div className="workflow-record-list">{customerJobs.map((job) => <article className="workflow-record" key={job.id}><div className="workflow-record-top"><div><span className="eyebrow">{job.id}</span><h3>{job.title}</h3><p>{job.category} · {job.location}</p></div><span className={`dash-status ${job.moderationStatus === "approved" ? "green" : job.moderationStatus === "rejected" ? "red" : "blue"}`}>{translateText(locale, job.moderationStatus === "approved" ? "Approved" : job.moderationStatus === "rejected" ? "Rejected" : "Pending review")}</span></div><p>{job.description}</p>{job.moderationStatus !== "approved" && <button className="table-action" onClick={() => { setEditingId(job.id); setTitle(job.title); setDetails(job.description); setCategory(job.category) }} type="button">{translateText(locale, "Edit")}</button>}</article>)}{!customerJobs.length && <div className="empty-state"><h3>{translateText(locale, "No job posts yet")}</h3><p>{translateText(locale, "Submit a post above to invite local professionals to apply. It will remain private until demo approval.")}</p></div>}</div></section>
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "Applications")}</h2><p>{translateText(locale, "Review applications to your approved job posts. Status changes appear in the worker workspace.")}</p></div></div><div className="workflow-record-list">{customerApplications.map((application) => { const worker = workers.find((item) => item.id === application.workerId); const job = customerJobs.find((item) => item.id === application.jobId); const canShortlist = ["submitted", "review"].includes(application.stage); const canInterview = application.stage === "shortlisted"; const canSelect = application.stage === "interview"; const canDecline = !["selected", "declined"].includes(application.stage); return <article className="workflow-record" key={application.id}><div className="workflow-record-top"><div><span className="eyebrow">{application.id} · {job?.title}</span><h3>{worker?.name ?? translateText(locale, "Applicant")}</h3><p>{worker?.headline ?? application.employer} · {formatDate(application.submittedAt, locale)}</p></div><span className="dash-status blue">{translateText(locale, application.stage)}</span></div><div className="workflow-actions">{canShortlist && <button className="button button-primary button-small" onClick={() => onUpdateApplication(application.id, "shortlisted")} type="button">{translateText(locale, "Shortlist")}</button>}{canInterview && <button className="button button-outline button-small" onClick={() => onUpdateApplication(application.id, "interview")} type="button">{translateText(locale, "Move to interview")}</button>}{canSelect && <button className="button button-primary button-small" onClick={() => onUpdateApplication(application.id, "selected")} type="button">{translateText(locale, "Select candidate")}</button>}{canDecline && <button className="table-action danger-action" onClick={() => onUpdateApplication(application.id, "declined")} type="button">{translateText(locale, "Decline")}</button>}</div></article>})}{!customerApplications.length && <div className="empty-state"><h3>{translateText(locale, "No applications yet")}</h3><p>{translateText(locale, "Applications to your approved job posts will appear here.")}</p><Link className="button button-outline button-small" href="/account/my-job-posts">{translateText(locale, "View my job posts")} <ArrowDownToLine size={13} /></Link></div>}</div></section>
}

function BookingWorkspace({ role, locale, bookings, onUpdateBooking, onToast }: {
  role: "account" | "worker" | "business" | "admin"
  locale: Locale
  bookings: DemoBooking[]
  onUpdateBooking: DashboardWorkflowProps["onUpdateBooking"]
  onToast: (message: string) => void
}) {
  const scoped = role === "worker" ? bookings.filter((booking) => booking.workerId === "abebe-tadesse" || booking.worker === "Abebe Tadesse") : bookings
  const [expanded, setExpanded] = useState("")
  const [evidence, setEvidence] = useState("")
  const [nextDate, setNextDate] = useState("")
  const [nextTime, setNextTime] = useState("")
  const [message, setMessage] = useState("")
  const [messagesByBooking, setMessagesByBooking] = useDemoStorageState<Record<string, { author: string; body: string; sentAt: string }[]>>("carava-demo-booking-messages", {})
  const [auditRows, setAuditRows] = useDemoStorageState("carava-demo-audit-log", demoAuditRecords)
  const [cancelTarget, setCancelTarget] = useState<DemoBooking | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const cancelDialogRef = useDialogFocus(Boolean(cancelTarget), () => { setCancelTarget(null); setCancelReason("") })
  const dates = getScheduleOptions(new Date(), 7, locale)

  const toggleDetails = (id: string) => {
    setExpanded((current) => current === id ? "" : id)
    setEvidence("")
    setNextDate("")
    setNextTime("")
  }

  const current = scoped.find((booking) => booking.id === expanded)
  const currentMessages = current ? messagesByBooking[current.id] ?? [] : []
  const saveMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!current || !message.trim()) return
    const next = [...currentMessages, { author: role === "worker" ? "Abebe Tadesse" : "Mekdes Alemu", body: message.trim(), sentAt: new Date().toISOString() }]
    const nextByBooking = { ...messagesByBooking, [current.id]: next }
    setMessagesByBooking(nextByBooking)
    publishDemoNotification(role === "worker" ? ["account", "business"] : ["worker"], `New demo booking message for ${current.id}.`, message.trim().slice(0, 120))
    setMessage("")
    onToast(t(locale, "messageSaved"))
  }
  const confirmCancellation = () => {
    if (!cancelTarget || (role === "admin" && !cancelReason.trim())) return
    if (role === "admin") {
      setAuditRows([{ ID: createDemoId("AU"), Name: `Cancel booking ${cancelTarget.id}`, Admin: "Carava Admin", Date: new Date().toLocaleString(), Status: cancelReason.trim() }, ...auditRows].slice(0, 100))
    }
    onUpdateBooking(cancelTarget.id, "Cancelled", { details: cancelReason.trim() || cancelTarget.details })
    publishDemoNotification(["account", "worker", "business", "admin"], `Demo booking ${cancelTarget.id} was cancelled.`)
    setCancelTarget(null)
    setCancelReason("")
  }

  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{t(locale, "bookingDetails")}</h2><p>{translateText(locale, "Requests, schedule changes, messages, and completion stay connected to this shared demo record.")}</p></div><CalendarDays aria-hidden="true" size={20} /></div>
    {scoped.length ? <div className="workflow-record-list">{scoped.map((booking) => <article className="workflow-record" key={booking.id}><div className="workflow-record-top"><div><span className="eyebrow">{booking.id}</span><h3>{booking.service}</h3><p>{role === "worker" ? `${translateText(locale, "Customer")} · ${booking.customer ?? "Mekdes Alemu"}` : `${translateText(locale, "Professional")} · ${booking.worker}`}</p></div><span className={`dash-status ${booking.status === "Completed" ? "green" : booking.status === "Cancelled" ? "red" : "blue"}`}>{statusText(booking.status, locale)}</span></div><div className="workflow-meta"><span>{formatDate(booking.date, locale)}{booking.schedule ? ` · ${booking.schedule}` : ""}</span><strong>{formatETB(booking.amount, locale)}</strong></div>{booking.details && <p className="workflow-detail-copy">{booking.details}</p>}
      <div className="workflow-actions"><button className="button button-outline button-small" onClick={() => toggleDetails(booking.id)} type="button">{expanded === booking.id ? t(locale, "back") : t(locale, "bookingDetails")}</button>{role === "admin" && ["Requested", "Confirmed", "Reschedule requested"].includes(booking.status) && <button className="table-action danger-action" onClick={() => setCancelTarget(booking)} type="button">{translateText(locale, "Cancel booking")}</button>}{role === "worker" && booking.status === "Requested" && <><button className="button button-primary button-small" onClick={() => onUpdateBooking(booking.id, "Confirmed")} type="button">{t(locale, "accept")}</button><button className="table-action danger-action" onClick={() => onUpdateBooking(booking.id, "Cancelled")} type="button">{t(locale, "decline")}</button></>}{role === "worker" && booking.status === "Reschedule requested" && <button className="button button-primary button-small" onClick={() => onUpdateBooking(booking.id, "Confirmed")} type="button">{t(locale, "confirm")}</button>}{role === "worker" && booking.status === "Confirmed" && <button className="button button-primary button-small" onClick={() => onUpdateBooking(booking.id, "In progress")} type="button">{t(locale, "startWork")}</button>}{role === "worker" && booking.status === "In progress" && <button className="button button-primary button-small" disabled={!evidence.trim() || expanded !== booking.id} onClick={() => { onUpdateBooking(booking.id, "Completion submitted", { completionEvidence: evidence.trim() }); setEvidence("") }} type="button">{t(locale, "submitCompletion")}</button>}{role === "account" && booking.status === "Completion submitted" && <button className="button button-primary button-small" onClick={() => onUpdateBooking(booking.id, "Completed")} type="button">{t(locale, "confirm")} {t(locale, "statusCompleted")}</button>}{role === "account" && ["Requested", "Confirmed"].includes(booking.status) && <><button className="button button-outline button-small" onClick={() => toggleDetails(booking.id)} type="button">{t(locale, "requestReschedule")}</button><button className="table-action danger-action" onClick={() => setCancelTarget(booking)} type="button">{t(locale, "cancel")}</button></>}{role === "admin" && !["Completed", "Cancelled"].includes(booking.status) && <button className="table-action danger-action" onClick={() => setCancelTarget(booking)} type="button">{t(locale, "cancel")}</button>}</div>
      {expanded === booking.id && <div className="booking-expanded"><div className="booking-expanded-section"><h4>{t(locale, "schedule")}</h4><p>{booking.date}{booking.schedule ? ` · ${booking.schedule}` : ""}</p>{booking.completionEvidence && <p><strong>{t(locale, "completionEvidence")}:</strong> {booking.completionEvidence}</p>}</div>{(role === "account" && ["Requested", "Confirmed"].includes(booking.status)) && <div className="booking-expanded-section"><h4>{t(locale, "requestReschedule")}</h4><div className="schedule-options">{dates.map((option) => <button aria-pressed={nextDate === option.value} className={`schedule-date ${nextDate === option.value ? "selected" : ""}`} key={option.value} onClick={() => setNextDate(option.value)} type="button"><span>{option.weekday}</span><strong>{option.day}</strong></button>)}</div><div className="schedule-times">{scheduleTimes.map((slot) => <button aria-pressed={nextTime === slot} className={`schedule-time ${nextTime === slot ? "selected" : ""}`} key={slot} onClick={() => setNextTime(slot)} type="button">{slot}</button>)}</div><button className="button button-outline button-small" disabled={!nextDate || !nextTime} onClick={() => { onUpdateBooking(booking.id, "Reschedule requested", { date: nextDate, schedule: nextTime }); setExpanded("") }} type="button">{t(locale, "requestReschedule")}</button></div>}{role === "worker" && booking.status === "In progress" && <label className="field"><span>{t(locale, "completionEvidence")}</span><textarea onChange={(event) => setEvidence(event.target.value)} placeholder={translateText(locale, "Describe the finished work")} value={evidence} /></label>}<div className="booking-expanded-section"><h4>{t(locale, "sendMessage")}</h4><div aria-live="polite" className="message-thread">{currentMessages.map((item, index) => <div className={`message-bubble ${item.author.startsWith("Abebe") === (role === "worker") ? "outgoing" : ""}`} key={`${item.sentAt}-${index}`}><strong>{item.author}</strong><p>{item.body}</p><small>{formatDate(item.sentAt, locale)}  {translateText(locale, "· Demo")}</small></div>)}</div><form className="message-compose" onSubmit={saveMessage}><label className="sr-only" htmlFor={`booking-message-${booking.id}`}>{t(locale, "writeMessage")}</label><input id={`booking-message-${booking.id}`} onChange={(event) => setMessage(event.target.value)} placeholder={t(locale, "writeMessage")} value={message} /><button aria-label={t(locale, "sendMessage")} className="button button-primary button-small" type="submit">{t(locale, "sendMessage")}</button></form></div></div>}
    </article>)}</div> : <div className="empty-state"><h2>{t(locale, "noBookings")}</h2><p>{translateText(locale, "New demo requests will appear here with their worker, schedule, and status.")}</p><Link className="button button-outline button-small" href="/search">{translateText(locale, "Find a professional")} <ArrowDownToLine size={13} /></Link></div>}
    {cancelTarget && <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCancelTarget(null) }}><section aria-labelledby="cancel-booking-title" aria-modal="true" className="confirm-dialog" ref={cancelDialogRef} role="dialog" tabIndex={-1}><h2 id="cancel-booking-title">{t(locale, "cancel")} {cancelTarget.id}?</h2><p>{translateText(locale, "This only changes the local demo record. No real booking is cancelled.")}</p><label className="field reason-field"><span>{translateText(locale, role === "admin" ? "Required audit reason" : "Reason (optional)")}</span><textarea onChange={(event) => setCancelReason(event.target.value)} required={role === "admin"} value={cancelReason} /></label><div className="confirm-dialog-actions"><button className="button button-outline button-small" onClick={() => setCancelTarget(null)} type="button">{t(locale, "back")}</button><button className="button button-primary button-small" disabled={role === "admin" && !cancelReason.trim()} onClick={confirmCancellation} type="button">{t(locale, "confirm")}</button></div></section></div>}
  </section>
}

function AdminFinanceWorkspace({ section, locale, bookings, onToast }: { section: string; locale: Locale; bookings: DemoBooking[]; onToast: (message: string) => void }) {
  const [statuses, setStatuses] = useDemoStorageState<Record<string, string>>("carava-demo-admin-finance-status", {})
  const [payouts, setPayouts] = useDemoStorageState<{ id: string; amount: number; status: string; date: string }[]>("carava-demo-payout-requests-worker", [])
  const [action, setAction] = useState<{ id: string; label: string } | null>(null)
  const [reason, setReason] = useState("")
  const financeDialogRef = useDialogFocus(Boolean(action), () => { setAction(null); setReason("") })
  const openAction = (next: { id: string; label: string }) => { setReason(""); setAction(next) }
  const bookingPayments = bookings.map((booking) => ({ id: `TX-${booking.id}`, bookingId: booking.id, title: booking.service, person: booking.worker, amount: booking.amount, status: statuses[`TX-${booking.id}`] ?? (booking.status === "Completed" ? "Completed" : booking.status === "Cancelled" ? "Cancelled" : "Pending review") }))
  const samplePayments = paymentRecords.map((record) => ({ id: record.id, bookingId: record.bookingId, title: `Service booking ${record.bookingId}`, person: record.payee, amount: record.amount, status: statuses[record.id] ?? (record.status === "completed" ? "Completed" : record.status === "refunded" ? "Refunded" : "Pending review") }))
  const records = section === "Payouts" ? payouts.map((payout) => ({ id: payout.id, bookingId: "Worker payout", title: "Worker payout request", person: "Abebe Tadesse", amount: payout.amount, status: statuses[payout.id] ?? payout.status })) : section === "Refunds" ? bookingPayments.filter((record) => record.status === "Completed") : [...bookingPayments, ...samplePayments]
  const execute = () => {
    if (!action || !reason.trim()) return
    const label = action.label.toLowerCase()
    const finalPayout = payouts.find((payout) => payout.id === action.id && /approved|rejected/i.test(payout.status))
    if (action.id.startsWith("PO-") && finalPayout) {
      onToast("This payout already has a demo review decision.")
      setAction(null)
      setReason("")
      return
    }
    const recordTitle = records.find((record) => record.id === action.id)?.title ?? action.id
    const decision = label.includes("approve") ? "Approved" : label.includes("reject") || label.includes("decline") ? "Rejected" : label.includes("refund") ? "Refunded" : "Reviewed"
    const recordedStatus = `${decision} · demo only`
    const next = { ...statuses, [action.id]: recordedStatus }
    setStatuses(next)
    if (action.id.startsWith("PO-")) {
      const nextPayouts = payouts.map((payout) => payout.id === action.id ? { ...payout, status: recordedStatus } : payout)
      setPayouts(nextPayouts)
    }
    publishDemoNotification(action.id.startsWith("PO-") ? "worker" : ["account", "worker", "business", "admin"], `Demo ${action.label.toLowerCase()} saved for ${recordTitle}.`)
    onToast(`Demo ${action.label.toLowerCase()} saved with an audit reason. No money moved.`)
    setAction(null)
    setReason("")
  }
  const exportRecords = () => {
    const csv = ["ID,Booking,Record,Person,Amount,Status", ...records.map((record) => [record.id, record.bookingId, record.title, record.person, formatETB(record.amount, locale), record.status].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    link.download = `carava-demo-${section.toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)} {translateText(locale, "review")}</h2><p>{translateText(locale, "Illustrative financial records only. Every decision requires an audit reason; no real transaction or payout is processed.")}</p></div><Wallet aria-hidden="true" size={20} /></div><div className="financial-summary"><span className="metric-icon"><Wallet size={17} /></span><span><small>{translateText(locale, "Demo-only records")}</small><strong>{records.length}</strong></span><button className="table-action" onClick={exportRecords} type="button"><ArrowDownToLine size={13} /> {translateText(locale, "Export CSV")}</button></div><div className="workflow-record-list">{records.map((record) => <article className="workflow-record" key={record.id}><div className="workflow-record-top"><div><span className="eyebrow">{record.id} · {record.bookingId}</span><h3>{record.title}</h3><p>{record.person} · {formatETB(record.amount, locale)}</p></div><span className={`dash-status ${/completed|approved|refunded/i.test(record.status) ? "green" : "blue"}`}>{translateText(locale, record.status)}</span></div><div className="workflow-actions">{section === "Payouts" ? <><button className="button button-outline button-small" onClick={() => openAction({ id: record.id, label:"Review payout" })} type="button">{translateText(locale, "Review details")}</button><button className="button button-primary button-small" disabled={/approved|rejected/i.test(record.status)} onClick={() => openAction({ id: record.id, label:"Approve payout" })} type="button">{translateText(locale, "Approve payout")}</button><button className="table-action danger-action" disabled={/approved|rejected/i.test(record.status)} onClick={() => openAction({ id: record.id, label:"Reject payout" })} type="button">{translateText(locale, "Decline")}</button></> : section === "Refunds" || /completed/i.test(record.status) ? <button className="button button-outline button-small" onClick={() => openAction({ id: record.id, label:"Review refund" })} type="button">{translateText(locale, "Review refund request")}</button> : <button className="button button-outline button-small" onClick={() => openAction({ id: record.id, label:"Review payment" })} type="button">{translateText(locale, "Review record")}</button>}</div></article>)}{records.length === 0 && <div className="empty-state"><h3>{translateText(locale, "No")} {section.toLowerCase()}  {translateText(locale, "records")}</h3><p>{translateText(locale, "Related demo financial activity will appear here.")}</p></div>}</div>{action && <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAction(null); setReason("") } }}><section aria-labelledby="financial-confirm-title" aria-modal="true" className="confirm-dialog" ref={financeDialogRef} role="dialog" tabIndex={-1}><h2 id="financial-confirm-title">{action.label}?</h2><p>{translateText(locale, "This action updates a simulated demo record only.")}</p><label className="field reason-field"><span>{translateText(locale, "Required reason")}</span><textarea aria-required="true" onChange={(event) => setReason(event.target.value)} required value={reason} /></label><div className="confirm-dialog-actions"><button className="button button-outline button-small" onClick={() => { setAction(null); setReason("") }} type="button">{translateText(locale, "Cancel")}</button><button className="button button-primary button-small" disabled={!reason.trim()} onClick={execute} type="button">{translateText(locale, "Confirm demo action")}</button></div></section></div>}</section>
}

type DashboardWorkflowProps = {
  onUpdateBooking: (id: string, status: DemoBooking["status"], update?: Partial<Pick<DemoBooking, "date" | "schedule" | "details" | "completionEvidence">>) => void
}

function FinanceWorkspace({ role, locale, bookings, onToast }: { role: "account" | "worker"; locale: Locale; bookings: DemoBooking[]; onToast: (message: string) => void }) {
  const key = `carava-demo-payout-requests-${role}`
  const [payouts, setPayouts] = useDemoStorageState<{ id: string; amount: number; status: string; date: string }[]>(key, [])
  const relevantBookings = role === "worker" ? bookings.filter((booking) => booking.workerId === "abebe-tadesse" || booking.worker === "Abebe Tadesse") : bookings
  const derived = relevantBookings.map((booking) => ({ id: `PAY-${booking.id}`, booking, status: booking.status === "Completed" ? "Completed · demo only" : booking.status === "Cancelled" ? "Cancelled · demo only" : "Pending · demo only" }))
  const total = relevantBookings.filter((booking) => booking.status === "Completed").reduce((sum, booking) => sum + booking.amount, 0)
  const hasPendingPayout = payouts.some((payout) => /pending/i.test(payout.status))
  const requestPayout = () => {
    if (total <= 0) return onToast("There is no completed demo balance to request yet.")
    if (payouts.some((payout) => /pending/i.test(payout.status))) return onToast("A demo payout request is already waiting for review.")
    const next = [{ id: `PO-DEMO-${String(payouts.length + 1).padStart(3, "0")}`, amount: total, status: "Pending review · demo only", date: new Date().toISOString().slice(0, 10) }, ...payouts]
    setPayouts(next)
    onToast(t(locale, "payoutSaved"))
  }
  const downloadReceipt = (booking: DemoBooking) => {
    const body = `CARAVA DEMO RECEIPT\nReceipt: RC-${booking.id}\nBooking: ${booking.id}\nService: ${booking.service}\nWorker: ${booking.worker}\nDate: ${booking.date}\nAmount: ${formatETB(booking.amount, locale)}\n\nIllustrative record only. No payment was processed.`
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }))
    link.download = `receipt-${booking.id}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{t(locale, "payments")}</h2><p>{t(locale, "demoFinancialNotice")}</p></div><Wallet aria-hidden="true" size={20} /></div><div className="financial-summary"><span className="metric-icon"><Wallet size={17} /></span><span><small>{translateText(locale, role === "worker" ? "Completed demo earnings" : "Completed demo bookings")}</small><strong>{formatETB(total, locale)}</strong></span><span className="dash-status">{translateText(locale, "Demo only")}</span></div>{role === "worker" && <button className="button button-primary button-small" disabled={total <= 0 || hasPendingPayout} onClick={requestPayout} type="button">{t(locale, "requestPayout")}</button>}<div className="workflow-record-list">{derived.map(({ id, booking, status }) => <article className="workflow-record financial-record" key={id}><div><span className="eyebrow">{id}</span><h3>{booking.service}</h3><p>{booking.worker} · {formatDate(booking.date, locale)}{booking.schedule ? ` · ${booking.schedule}` : ""}</p></div><div className="workflow-meta"><span className="dash-status blue">{status}</span><strong>{formatETB(booking.amount, locale)}</strong></div>{role === "account" && <button className="table-action" onClick={() => downloadReceipt(booking)} type="button"><ArrowDownToLine size={13} /> {translateText(locale, "Download demo receipt")}</button>}</article>)}{payouts.map((payout) => <article className="workflow-record" key={payout.id}><span className="eyebrow">{payout.id}</span><strong>{formatETB(payout.amount, locale)}</strong><p>{translateText(locale, "Requested")} {formatDate(payout.date, locale)}</p><span className="dash-status blue">{translateText(locale, payout.status)}</span></article>)}{derived.length === 0 && <div className="empty-state"><h3>{translateText(locale, "No payment records yet")}</h3><p>{translateText(locale, "Booking payment states will appear here. No real payment is accepted.")}</p></div>}</div></section>
}

function ReviewWorkspace({ locale, bookings, onToast }: { locale: Locale; bookings: DemoBooking[]; onToast: (message: string) => void }) {
  const [reviews, setReviews] = useDemoStorageState<Record<string, { rating: number; body: string; workerId?: string; workerName?: string; submittedAt?: string }>>("carava-demo-reviews", {})
  const [drafts, setDrafts] = useState<Record<string, { rating: number; body: string }>>({})
  const completed = bookings.filter((booking) => booking.status === "Completed")
  const submit = (booking: DemoBooking) => {
    const draft = drafts[booking.id]
    if (!draft || draft.rating < 1 || !draft.body.trim()) return
    const next = { ...reviews, [booking.id]: { ...draft, body: draft.body.trim(), workerId: booking.workerId ?? workers.find((worker) => worker.name === booking.worker)?.id, workerName: booking.worker, submittedAt: new Date().toISOString() } }
    setReviews(next)
    onToast("Your review was added to this local demo. It is not public.")
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "Review completed work")}</h2><p>{translateText(locale, "Share useful feedback for a completed sample booking. Reviews stay in this browser demo.")}</p></div><Star aria-hidden="true" size={20} /></div>{completed.length ? <div className="workflow-record-list">{completed.map((booking) => <article className="workflow-record" key={booking.id}><span className="eyebrow">{booking.id}</span><h3>{booking.service}</h3><p>{booking.worker} · {formatDate(booking.date, locale)}</p>{reviews[booking.id] ? <div className="review-card"><strong>{"★".repeat(reviews[booking.id].rating)}</strong><p>{reviews[booking.id].body}</p><span className="dash-status">{translateText(locale, "Saved in demo only")}</span></div> : <div className="review-compose"><label className="field"><span>{translateText(locale, "Rating")}</span><select aria-label={`Rating for ${booking.id}`} onChange={(event) => setDrafts((current) => ({ ...current, [booking.id]: { rating: Number(event.target.value), body: current[booking.id]?.body ?? "" } }))} value={drafts[booking.id]?.rating ?? 5}><option value="5">5 — {translateText(locale, "Excellent")}</option><option value="4">4 — {translateText(locale, "Good")}</option><option value="3">3 — {translateText(locale, "Okay")}</option><option value="2">2 — {translateText(locale, "Needs improvement")}</option><option value="1">1 — {translateText(locale, "Poor")}</option></select></label><label className="field"><span>{translateText(locale, "What went well?")}</span><textarea maxLength={600} onChange={(event) => setDrafts((current) => ({ ...current, [booking.id]: { rating: current[booking.id]?.rating ?? 5, body: event.target.value } }))} value={drafts[booking.id]?.body ?? ""} /></label><button className="button button-primary button-small" disabled={!drafts[booking.id]?.body.trim()} onClick={() => submit(booking)} type="button">{t(locale, "submitReview")}</button></div>}</article>)}</div> : <div className="empty-state"><ClipboardCheck size={20} /><h3>{t(locale, "noCompletedBookings")}</h3><p>{translateText(locale, "Confirm a submitted completion from Bookings before leaving a review.")}</p></div>}</section>
}

function WorkerReviewWorkspace({ locale, bookings, onToast }: { locale: Locale; bookings: DemoBooking[]; onToast: (message: string) => void }) {
  const [customerReviews] = useDemoStorageState<Record<string, { rating: number; body: string; workerId?: string; workerName?: string; submittedAt?: string }>>("carava-demo-reviews", {})
  const [responses, setResponses] = useDemoStorageState<Record<string, string>>("carava-demo-worker-review-responses", {})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const submitted = Object.entries(customerReviews).flatMap(([bookingId, review]) => {
    const booking = bookings.find((item) => item.id === bookingId)
    const workerId = review.workerId ?? booking?.workerId ?? workers.find((worker) => worker.name === booking?.worker)?.id
    if (workerId !== "abebe-tadesse") return []
    return [{ id: `RV-${bookingId}`, bookingId, author: "Mekdes Alemu", body: review.body, rating: review.rating, status: "published", createdAt: review.submittedAt ?? "" }]
  })
  const sampleReviews = reviewRecords.filter((review) => review.workerId === "abebe-tadesse" && !submitted.some((item) => item.bookingId === review.bookingId))
  const allReviews = [...submitted, ...sampleReviews]
  const saveResponse = (reviewId: string) => {
    const response = drafts[reviewId]?.trim()
    if (!response) return
    const next = { ...responses, [reviewId]: response }
    setResponses(next)
    onToast(translateText(locale, "Your demo reply was saved. It is not sent to the reviewer."))
  }

  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "Reviews and feedback")}</h2><p>{translateText(locale, "Read customer feedback and save a demo reply for your profile history.")}</p></div><Star aria-hidden="true" size={20} /></div>{allReviews.length ? <div className="workflow-record-list">{allReviews.map((review) => <article className="workflow-record" key={review.id}><div className="workflow-record-top"><div><span className="eyebrow">{review.id} · {review.bookingId}</span><h3>{review.author}</h3></div><span className="dash-status blue">{translateText(locale, review.status)}</span></div><p>{review.body}</p><p className="rating"><Star aria-hidden="true" size={13} /> {review.rating}.0 · {translateText(locale, "Customer rating")}</p>{responses[review.id] ? <div className="review-card"><strong>{translateText(locale, "Your demo reply")}</strong><p>{responses[review.id]}</p></div> : <form className="review-compose" onSubmit={(event) => { event.preventDefault(); saveResponse(review.id) }}><label className="field"><span>{translateText(locale, "Reply to this review")}</span><textarea maxLength={500} onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))} required value={drafts[review.id] ?? ""} /></label><button className="button button-outline button-small" disabled={!drafts[review.id]?.trim()} type="submit">{translateText(locale, "Save demo reply")}</button></form>}</article>)}</div> : <div className="empty-state"><h3>{translateText(locale, "No reviews yet")}</h3><p>{translateText(locale, "Reviews on completed work will appear here.")}</p><Link className="button button-outline button-small" href="/account/bookings">{translateText(locale, "View bookings")} <ArrowDownToLine size={13} /></Link></div>}</section>
}

function DisputeWorkspace({ role, locale, bookings, onToast }: { role: "account" | "admin"; locale: Locale; bookings: DemoBooking[]; onToast: (message: string) => void }) {
  const [items, setItems] = useDemoStorageState<{ id: string; bookingId: string; openedBy: string; subject: string; detail: string; status: string; reason?: string }[]>("carava-demo-disputes", disputeRecords.map((record) => ({ ...record, detail: "Illustrative dispute details. No real case is open." })))
  const [bookingId, setBookingId] = useState("")
  const [subject, setSubject] = useState("")
  const [detail, setDetail] = useState("")
  const [resolution, setResolution] = useState("")
  const [activeId, setActiveId] = useState("")
  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!bookingId || !subject.trim() || !detail.trim()) return
    const next = [{ id: createDemoId("DSP"), bookingId, openedBy: "Mekdes Alemu", subject: subject.trim(), detail: detail.trim(), status: "open", createdAt: new Date().toISOString() }, ...items]
    setItems(next)
    setSubject("")
    setDetail("")
    onToast(translateText(locale, "Demo complaint saved. It was not sent to a support team."))
  }
  const updateStatus = (id: string, status: string) => {
    if (!resolution.trim()) return onToast(translateText(locale, "Add a reason before resolving this demo dispute."))
    const next = items.map((item) => item.id === id ? { ...item, status, reason: resolution.trim() } : item)
    setItems(next)
    setResolution("")
    setActiveId("")
    onToast(`Demo dispute marked ${status}. Reason saved in the local audit note.`)
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, role === "admin" ? "Dispute investigation queue" : "Complaints and disputes")}</h2><p>{translateText(locale, "These example cases are local-only records; no support team or external system receives them.")}</p></div><ShieldAlert aria-hidden="true" size={20} /></div>{role === "account" && <form className="workflow-form" onSubmit={create}><label className="field"><span>{translateText(locale, "Related booking")}</span><select onChange={(event) => setBookingId(event.target.value)} required value={bookingId}><option value="">{translateText(locale, "Choose a booking")}</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} · {booking.service}</option>)}</select></label><label className="field"><span>{translateText(locale, "Complaint topic")}</span><input maxLength={100} onChange={(event) => setSubject(event.target.value)} required value={subject} /></label><label className="field"><span>{translateText(locale, "What happened?")}</span><textarea maxLength={1200} onChange={(event) => setDetail(event.target.value)} required value={detail} /></label><button className="button button-primary button-small" type="submit">{translateText(locale, "Submit demo complaint")}</button></form>}<div className="workflow-record-list">{items.map((item) => <article className="workflow-record" key={item.id}><div className="workflow-record-top"><div><span className="eyebrow">{item.id} · {item.bookingId}</span><h3>{item.subject}</h3><p>{translateText(locale, "Opened by")} {item.openedBy}</p></div><span className={`dash-status ${item.status === "resolved" ? "green" : "blue"}`}>{item.status}</span></div><p>{item.detail}</p>{item.reason && <p><strong>{translateText(locale, "Resolution note:")}</strong> {item.reason}</p>}{role === "admin" && item.status !== "resolved" && <div className="workflow-actions"><button className="button button-outline button-small" onClick={() => { setActiveId(activeId === item.id ? "" : item.id); setResolution("") }} type="button">{translateText(locale, "Investigate")}</button>{activeId === item.id && <><label className="field"><span>{translateText(locale, "Required investigation reason")}</span><textarea onChange={(event) => setResolution(event.target.value)} value={resolution} /></label><button className="button button-primary button-small" disabled={!resolution.trim()} onClick={() => updateStatus(item.id, "resolved")} type="button">{translateText(locale, "Resolve demo case")}</button></>}</div>}</article>)}</div></section>
}

type DemoSupportCase = { id: string; subject: string; user: string; priority: string; details: string; status: string }

function AdminSupportWorkspace({ section, locale, onToast }: { section: string; locale: Locale; onToast: (message: string) => void }) {
  const initialCases = dashboardRecords("admin", section).map((row) => ({ id: row.ID ?? "SUP-UNKNOWN", subject: row.Name ?? "Support request", user: row.User ?? "Demo user", priority: row.Priority ?? "Normal", details: row.Detail ?? "No additional demo details.", status: row.Status ?? "Open" }))
  const storageKey = `carava-demo-support-queue-${section.toLowerCase().replaceAll(" ", "-")}`
  const [cases, setCases] = useDemoStorageState<DemoSupportCase[]>(storageKey, initialCases)
  const [contactMessages, setContactMessages] = useDemoStorageState<{ id: string; name: string; email: string; body: string; sentAt: string; status: string }[]>("carava-demo-support-inbox", [])
  const [, setAuditRows] = useDemoStorageState("carava-demo-audit-log", demoAuditRecords)
  const [expandedId, setExpandedId] = useState("")
  const [action, setAction] = useState<{ id: string; label: "Review" | "Resolve" | "Escalate" } | null>(null)
  const [reason, setReason] = useState("")
  const dialogRef = useDialogFocus(Boolean(action), () => { setAction(null); setReason("") })
  const contactCases: DemoSupportCase[] = contactMessages.map((message) => ({ id: message.id, subject: `Contact message from ${message.name}`, user: message.email || "Website visitor", priority: "Normal", details: message.body, status: message.status || "Open" }))
  const visibleCases = [...contactCases.filter((item) => !cases.some((existing) => existing.id === item.id)), ...cases]
  const selected = visibleCases.find((item) => item.id === action?.id)
  const confirmAction = () => {
    if (!action || !selected || !reason.trim()) return
    const status = action.label === "Review" ? "In review" : action.label === "Resolve" ? "Resolved" : "Escalated"
    setCases((current) => current.map((item) => item.id === action.id ? { ...item, status } : item))
    if (contactMessages.some((message) => message.id === action.id)) setContactMessages((current) => current.map((message) => message.id === action.id ? { ...message, status } : message))
    setAuditRows((current) => [{ ID: createDemoId("AU"), Name: `${action.label} support case ${action.id}`, Admin: "Carava Admin", Date: new Date().toLocaleString(), Status: reason.trim() }, ...current].slice(0, 100))
    publishDemoNotification("admin", `Demo support case ${action.id} was ${status.toLowerCase()}.`, reason.trim().slice(0, 120))
    onToast(translateText(locale, action.label === "Review" ? "Demo support case moved to review with a reason. No message was sent." : action.label === "Resolve" ? "Demo support case resolved with a reason. No message was sent." : "Demo support case escalated with a reason. No message was sent."))
    setAction(null)
    setReason("")
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)}</h2><p>{translateText(locale, "Review sample support requests, record a reason, and keep decisions in the demo audit log. No message is delivered to a user.")}</p></div><ShieldAlert aria-hidden="true" size={20} /></div><div className="workflow-record-list">{visibleCases.map((supportCase) => <article className="workflow-record" key={supportCase.id}><div className="workflow-record-top"><div><span className="eyebrow">{supportCase.id} · {translateText(locale, supportCase.priority)}</span><h3>{translateText(locale, supportCase.subject)}</h3><p>{translateText(locale, "Reported by")} {supportCase.user}</p></div><span className={`dash-status ${supportCase.status === "Resolved" ? "green" : supportCase.priority === "High" ? "red" : "blue"}`}>{translateText(locale, supportCase.status)}</span></div>{expandedId === supportCase.id && <p className="workflow-detail-copy">{translateText(locale, supportCase.details)}</p>}<div className="workflow-actions"><button aria-expanded={expandedId === supportCase.id} className="button button-outline button-small" onClick={() => setExpandedId((current) => current === supportCase.id ? "" : supportCase.id)} type="button">{translateText(locale, expandedId === supportCase.id ? "Hide details" : "View case details")}</button>{supportCase.status !== "Resolved" && <><button className="button button-outline button-small" onClick={() => { setAction({ id: supportCase.id, label: "Review" }); setReason("") }} type="button">{translateText(locale, "Mark in review")}</button><button className="button button-primary button-small" onClick={() => { setAction({ id: supportCase.id, label: "Resolve" }); setReason("") }} type="button">{translateText(locale, "Resolve case")}</button>{supportCase.priority === "High" && <button className="table-action danger-action" onClick={() => { setAction({ id: supportCase.id, label: "Escalate" }); setReason("") }} type="button">{translateText(locale, "Escalate case")}</button>}</>}</div></article>)}</div>{visibleCases.length === 0 && <div className="empty-state"><h3>{translateText(locale, "No support requests")}</h3><p>{translateText(locale, "New demo support requests will appear here.")}</p></div>}{action && <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAction(null); setReason("") } }}><section aria-labelledby="support-action-title" aria-modal="true" className="confirm-dialog" ref={dialogRef} role="dialog" tabIndex={-1}><h2 id="support-action-title">{translateText(locale, action.label)} {translateText(locale, "support case")} {action.id}</h2><p>{translateText(locale, "This is a demo support decision. The reason is saved to the local audit log; no message is sent.")}</p><label className="field reason-field"><span>{translateText(locale, "Required audit reason")}</span><textarea autoFocus onChange={(event) => setReason(event.target.value)} required value={reason} /></label><div className="confirm-dialog-actions"><button className="button button-outline button-small" onClick={() => { setAction(null); setReason("") }} type="button">{t(locale, "back")}</button><button className="button button-primary button-small" disabled={!reason.trim()} onClick={confirmAction} type="button">{t(locale, "confirm")}</button></div></section></div>}</section>
}

function WorkerProfileWorkspace({ section, locale, onToast }: { section: string; locale: Locale; onToast: (message: string) => void }) {
  const worker = workers.find((item) => item.id === "abebe-tadesse")!
  const key = "carava-demo-worker-profile"
  const [profile, setProfile] = useDemoStorageState(key, { headline: worker.headline, category: worker.category, skills: worker.skills.join(", "), rate: String(worker.hourlyRate), about: worker.about })
  const [days, setDays] = useDemoStorageState<string[]>("carava-demo-worker-availability", ["Mon", "Tue", "Wed", "Thu", "Fri"])
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onToast("Worker profile and service pricing saved in this browser demo.")
  }
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)}</h2><p>{translateText(locale, "Update the worker demo profile, skills, service price, and weekly availability.")}</p></div></div>{section === "Availability calendar" ? <><div className="availability-days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <button aria-pressed={days.includes(day)} className={`availability-day ${days.includes(day) ? "active" : ""}`} key={day} onClick={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} type="button">{day}<Check size={15} /></button>)}</div><button className="button button-primary button-small" onClick={() => onToast("Availability saved to the local demo profile.")} type="button">{translateText(locale, "Save availability")}</button></> : <form className="workflow-form" onSubmit={save}><label className="field"><span>{translateText(locale, "Service headline")}</span><input maxLength={100} minLength={3} onChange={(event) => setProfile((current) => ({ ...current, headline: event.target.value }))} required value={profile.headline} /></label><label className="field"><span>{translateText(locale, "Primary category")}</span><input maxLength={80} minLength={2} onChange={(event) => setProfile((current) => ({ ...current, category: event.target.value }))} required value={profile.category} /></label><label className="field"><span>{translateText(locale, "Skills (comma separated)")}</span><textarea maxLength={600} minLength={2} onChange={(event) => setProfile((current) => ({ ...current, skills: event.target.value }))} required value={profile.skills} /></label><label className="field"><span>{translateText(locale, "Hourly price (ETB)")}</span><input max="100000" min="0" onChange={(event) => setProfile((current) => ({ ...current, rate: event.target.value }))} required step="1" type="number" value={profile.rate} /></label><label className="field"><span>{translateText(locale, "About your work")}</span><textarea maxLength={1200} minLength={20} onChange={(event) => setProfile((current) => ({ ...current, about: event.target.value }))} required value={profile.about} /></label><button className="button button-primary button-small" type="submit">{translateText(locale, "Save profile and services")}</button><p className="demo-data-note">{t(locale, "demo")}  {translateText(locale, "— this does not change public sample profiles.")}</p></form>}</section>
}

function WorkerOpportunities({ section, locale, applications, marketplaceJobs, onToast }: { section: string; locale: Locale; applications: ApplicationRecord[]; marketplaceJobs: Job[]; onToast: (message: string) => void }) {
  const invitationKey = "carava-demo-invitations"
  const [invitations, setInvitations] = useDemoStorageState<{ id: string; jobId: string; status: "Pending" | "Accepted" | "Declined" }[]>(invitationKey, [{ id: "INV-042", jobId: "job-1", status: "Pending" }, { id: "INV-039", jobId: "job-4", status: "Pending" }])
  const [assignments] = useDemoStorageState<{ id: string; workerId: string; jobId: string; status: string }[]>("carava-demo-business-worker-assignments", [])
  const respond = (id: string, status: "Accepted" | "Declined") => {
    const next = invitations.map((invitation) => invitation.id === id ? { ...invitation, status } : invitation)
    setInvitations(next)
    onToast(`Demo invitation ${status.toLowerCase()}.`)
  }
  if (section === "Applications") return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{t(locale, "applications")}</h2><p>{translateText(locale, "Application stage changes in the business workspace are reflected here.")}</p></div></div>{assignments.filter((assignment) => assignment.workerId === "abebe-tadesse" && assignment.status === "Active").map((assignment) => <article className="workflow-record" key={assignment.id}><span className="eyebrow">{assignment.id} · {translateText(locale, "Business assignment")}</span><h3>{marketplaceJobs.find((job) => job.id === assignment.jobId)?.title ?? assignment.jobId}</h3><span className="dash-status green">{translateText(locale, "Assigned")}</span></article>)}<div className="workflow-record-list">{applications.filter((application) => application.workerId === "abebe-tadesse").map((application) => <article className="workflow-record" key={application.id}><span className="eyebrow">{application.id} · {formatDate(application.submittedAt, locale)}</span><h3>{marketplaceJobs.find((job) => job.id === application.jobId)?.title ?? application.jobId}</h3><p>{application.employer}</p><span className="dash-status blue">{translateText(locale, application.stage)}</span></article>)}</div>{!applications.some((application) => application.workerId === "abebe-tadesse") && <div className="empty-state"><h3>{translateText(locale, "No applications yet")}</h3><p>{translateText(locale, "Find a role in Job discovery and apply to track it here.")}</p><Link className="button button-outline button-small" href="/jobs">{translateText(locale, "Browse jobs")} <ArrowDownToLine size={13} /></Link></div>}</section>
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{t(locale, "invitations")}</h2><p>{translateText(locale, "Responding changes this sample invitation only. No employer is notified.")}</p></div></div><div className="workflow-record-list">{invitations.map((invitation) => { const job = marketplaceJobs.find((item) => item.id === invitation.jobId) ?? marketplaceJobs[0]; return <article className="workflow-record" key={invitation.id}><span className="eyebrow">{invitation.id}</span><h3>{job?.title ?? "Local job invitation"}</h3><p>{job?.company ?? "Adama employer"} · {job?.location ?? "Adama"}</p><span className="dash-status blue">{invitation.status}</span>{invitation.status === "Pending" && <div className="workflow-actions"><button className="button button-primary button-small" onClick={() => respond(invitation.id, "Accepted")} type="button">{t(locale, "accept")}</button><button className="button button-outline button-small" onClick={() => respond(invitation.id, "Declined")} type="button">{t(locale, "decline")}</button></div>}</article>})}</div></section>
}

function BusinessAssignments({ locale, jobs, onToast }: { locale: Locale; jobs: Job[]; onToast: (message: string) => void }) {
  const [assignments, setAssignments] = useDemoStorageState<{ id: string; workerId: string; jobId: string; status: string }[]>("carava-demo-business-worker-assignments", [])
  const [workerId, setWorkerId] = useState("")
  const [jobId, setJobId] = useState("")
  const assign = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!workerId || !jobId) return
    if (assignments.some((assignment) => assignment.workerId === workerId && assignment.jobId === jobId && assignment.status === "Active")) {
      onToast(translateText(locale, "This worker is already assigned to this role."))
      return
    }
    const next = [{ id: createDemoId("ASG"), workerId, jobId, status: "Active" }, ...assignments]
    setAssignments(next)
    setWorkerId("")
    setJobId("")
    onToast(translateText(locale, "Worker assignment saved in the shared demo workspace."))
  }
  const remove = (id: string) => setAssignments((current) => current.map((assignment) => assignment.id === id ? { ...assignment, status: "Removed" } : assignment))
  const activeJobs = jobs.filter((job) => job.moderationStatus !== "pending" && job.moderationStatus !== "rejected")
  const alreadyAssigned = assignments.some((assignment) => assignment.workerId === workerId && assignment.jobId === jobId && assignment.status === "Active")
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "Worker assignments")}</h2><p>{translateText(locale, "Assign a sample worker to one of your published vacancies. The assignment appears in the worker workspace.")}</p></div></div><form className="workflow-form" onSubmit={assign}><label className="field"><span>{translateText(locale, "Worker")}</span><select onChange={(event) => setWorkerId(event.target.value)} required value={workerId}><option value="">{translateText(locale, "Choose a worker")}</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.category}</option>)}</select></label><label className="field"><span>{translateText(locale, "Vacancy")}</span><select onChange={(event) => setJobId(event.target.value)} required value={jobId}><option value="">{translateText(locale, "Choose a published vacancy")}</option>{activeJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label><button className="button button-primary button-small" disabled={!activeJobs.length || alreadyAssigned} type="submit">{translateText(locale, alreadyAssigned ? "Worker already assigned" : "Assign worker")}</button></form><div className="workflow-record-list">{assignments.map((assignment) => { const worker = workers.find((item) => item.id === assignment.workerId); const job = jobs.find((item) => item.id === assignment.jobId); return <article className="workflow-record" key={assignment.id}><div className="workflow-record-top"><div><span className="eyebrow">{assignment.id}</span><h3>{worker?.name ?? translateText(locale, "Worker")}</h3><p>{job?.title ?? translateText(locale, "Vacancy")}</p></div><span className={`dash-status ${assignment.status === "Active" ? "green" : "red"}`}>{translateText(locale, assignment.status)}</span></div>{assignment.status === "Active" && <button className="table-action danger-action" onClick={() => remove(assignment.id)} type="button">{translateText(locale, "Remove assignment")}</button>}</article>})}{!assignments.length && <div className="empty-state"><h3>{translateText(locale, "No workers assigned yet")}</h3><p>{translateText(locale, "Assignments are demo-only and do not notify the worker.")}</p></div>}</div></section>
}

function BusinessWorkspace({ section, locale, applications, marketplaceJobs, onUpdateApplication, onToast }: { section: string; locale: Locale; applications: ApplicationRecord[]; marketplaceJobs: Job[]; onUpdateApplication: (id: string, stage: ApplicationRecord["stage"]) => void; onToast: (message: string) => void }) {
  const profileKey = "carava-demo-business-profile"
  const [profile, setProfile] = useDemoStorageState(profileKey, businessProfiles[0])
  const [verificationStatuses, setVerificationStatuses] = useDemoStorageState("carava-demo-verification-statuses", initialVerificationStatuses)
  const [interviews, setInterviews] = useDemoStorageState<Record<string, { date: string; time: string }>>("carava-demo-business-interviews", {})
  const [team, setTeam] = useDemoStorageState<{ name: string; role: string; assignment: string }[]>("carava-demo-business-team", [{ name: "Mekdes Alemu", role: "Owner", assignment: "Hiring and operations" }, { name: "Abebe Tadesse", role: "Hiring manager", assignment: "Electrician role" }])
  const [memberName, setMemberName] = useState("")
  const [memberRole, setMemberRole] = useState("Recruiter")
  const [memberAssignment, setMemberAssignment] = useState("")
  const dates = getScheduleOptions(new Date(), 7, locale)
  const visibleApps = applications.filter((application) => marketplaceJobs.some((job) => job.id === application.jobId && (job.company === profile.name || job.company === businessProfiles[0].name)))
  const companyVerificationStatus = verificationStatuses["USR-130"] ?? (profile.verified ? "Verified (illustrative)" : "Pending review")
  const updateProfile = (field: "name" | "industry" | "neighborhood" | "description", value: string) => setProfile((current) => ({ ...current, [field]: value }))
  const saveProfile = () => { onToast(translateText(locale, "Company profile saved in the local demo.")) }
  const saveInterview = (applicationId: string, date: string, time: string) => {
    if (!date || !time) return
    const next = { ...interviews, [applicationId]: { date, time } }
    setInterviews(next)
    onUpdateApplication(applicationId, "interview")
    onToast(translateText(locale, "Demo interview scheduled. No applicant was contacted."))
  }
  const addMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedName = memberName.trim()
    if (!normalizedName) return
    if (team.some((member) => member.name.trim().toLowerCase() === normalizedName.toLowerCase())) {
      onToast(translateText(locale, "This team member is already listed."))
      return
    }
    const next = [{ name: normalizedName, role: memberRole, assignment: memberAssignment.trim() || "Unassigned" }, ...team]
    setTeam(next)
    setMemberName("")
    setMemberAssignment("")
    onToast(translateText(locale, "Demo team member added. No invitation was sent."))
  }
  const updateTeamMember = (index: number, field: "role" | "assignment", value: string) => setTeam((current) => current.map((member, memberIndex) => memberIndex === index ? { ...member, [field]: value } : member))
  const removeTeamMember = (index: number) => {
    const next = team.filter((_, memberIndex) => memberIndex !== index)
    setTeam(next)
    onToast(translateText(locale, "Team member removed from the local demo."))
  }
  if (section === "Worker assignments") return <BusinessAssignments jobs={marketplaceJobs.filter((job) => job.company === profile.name || job.company === businessProfiles[0].name)} locale={locale} onToast={onToast} />
  if (section === "Company profile" || section === "Company verification") return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)}</h2><p>{translateText(locale, "Company details and verification status are illustrative and remain local to this browser.")}</p></div></div><div className="workflow-form"><form className="workflow-form" onSubmit={(event) => { event.preventDefault(); saveProfile() }}><label className="field"><span>{translateText(locale, "Company name")}</span><input maxLength={100} minLength={2} onChange={(event) => updateProfile("name", event.target.value)} required value={profile.name} /></label><label className="field"><span>{translateText(locale, "Industry")}</span><input maxLength={80} minLength={2} onChange={(event) => updateProfile("industry", event.target.value)} required value={profile.industry} /></label><label className="field"><span>{translateText(locale, "Neighborhood")}</span><input maxLength={80} minLength={2} onChange={(event) => updateProfile("neighborhood", event.target.value)} required value={profile.neighborhood} /></label><label className="field"><span>{translateText(locale, "About the company")}</span><textarea maxLength={1200} minLength={20} onChange={(event) => updateProfile("description", event.target.value)} required value={profile.description} /></label><button className="button button-primary button-small" type="submit">{translateText(locale, "Save company profile")}</button></form><div className="settings-row"><strong>{translateText(locale, "Verification state")}</strong><span className={`dash-status ${companyVerificationStatus.includes("Verified") ? "green" : "blue"}`}>{companyVerificationStatus}</span></div>{section === "Company verification" && <><button className="button button-outline button-small" disabled={verificationStatuses["USR-130"] === "Pending review"} onClick={() => { const next = { ...profile, verified: false }; setProfile(next); setVerificationStatuses((current) => ({ ...current, "USR-130": "Pending review" })); onToast(translateText(locale, "Demo company verification request is pending. No documents were uploaded.")) }} type="button">{translateText(locale, "Request verification review")}</button><p className="demo-data-note">{translateText(locale, "Verification requests and decisions are demo-only; no documents are collected.")}</p></>}</div></section>
  if (["Applicants", "Candidates", "Recruitment pipeline", "Interviews"].includes(section)) return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)}</h2><p>{translateText(locale, "Move candidates through a shared recruitment pipeline and schedule example interviews.")}</p></div></div><div className="workflow-record-list">{visibleApps.map((application) => { const applicant = workers.find((worker) => worker.id === application.workerId); const job = marketplaceJobs.find((item) => item.id === application.jobId); const interview = interviews[application.id]; return <article className="workflow-record" key={application.id}><div className="workflow-record-top"><div><span className="eyebrow">{application.id} · {job?.title ?? "Vacancy"}</span><h3>{applicant?.name ?? "Local applicant"}</h3><p>{applicant?.headline ?? application.employer} · {translateText(locale, "Applied")} {formatDate(application.submittedAt, locale)}</p></div><span className="dash-status blue">{translateText(locale, application.stage)}</span></div><div className="workflow-meta"><span>{applicant?.category ?? translateText(locale, "Applicant")}</span><span>{applicant?.rating ? `★ ${applicant.rating} · ${applicant.reviewCount} ${translateText(locale, "reviews")}` : translateText(locale, "Demo profile")}</span></div>{interview && <p className="availability-note">{translateText(locale, "Interview scheduled:")} {formatDate(interview.date, locale)} · {interview.time}</p>}<div className="workflow-actions">{application.stage === "submitted" && <button className="button button-outline button-small" onClick={() => onUpdateApplication(application.id, "review")} type="button">{translateText(locale, "Start review")}</button>}{!["shortlisted", "interview", "selected", "declined"].includes(application.stage) && <button className="button button-primary button-small" onClick={() => onUpdateApplication(application.id, "shortlisted")} type="button">{translateText(locale, "Shortlist")}</button>}{!["interview", "selected", "declined"].includes(application.stage) && <button className="button button-outline button-small" disabled={!interview} onClick={() => interview && saveInterview(application.id, interview.date, interview.time)} type="button">{translateText(locale, "Schedule interview")}</button>}{application.stage === "shortlisted" && <div className="schedule-inline"><label className="field"><span>{translateText(locale, "Interview day")}</span><select aria-label={`Interview day for ${application.id}`} onChange={(event) => setInterviews((current) => ({ ...current, [application.id]: { date: event.target.value, time: current[application.id]?.time ?? "09:00" } }))} value={interview?.date ?? ""}><option value="">{translateText(locale, "Choose day")}</option>{dates.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label><label className="field"><span>{translateText(locale, "Time")}</span><select aria-label={`Interview time for ${application.id}`} onChange={(event) => setInterviews((current) => ({ ...current, [application.id]: { date: current[application.id]?.date ?? "", time: event.target.value } }))} value={interview?.time ?? "09:00"}>{scheduleTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select></label></div>}{["shortlisted", "interview"].includes(application.stage) && <button className="button button-primary button-small" onClick={() => onUpdateApplication(application.id, "selected")} type="button">{translateText(locale, "Hire candidate")}</button>}{!["selected", "declined"].includes(application.stage) && <button className="table-action danger-action" onClick={() => onUpdateApplication(application.id, "declined")} type="button">{translateText(locale, "Decline")}</button>}</div></article>})}{visibleApps.length === 0 && <div className="empty-state"><h3>{translateText(locale, "No applicants yet")}</h3><p>{translateText(locale, "Applications to company vacancies will show in this shared pipeline.")}</p><Link className="button button-outline button-small" href="/business/vacancies">{translateText(locale, "View vacancies")} <ArrowDownToLine size={13} /></Link></div>}</div></section>
  if (["Team members", "Team roles"].includes(section)) return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, section)}</h2><p>{translateText(locale, "Manage the local sample team. Adding someone here does not send an invitation.")}</p></div></div><form className="workflow-form" onSubmit={addMember}><label className="field"><span>{translateText(locale, "Team member name")}</span><input maxLength={80} minLength={2} onChange={(event) => setMemberName(event.target.value)} required value={memberName} /></label><label className="field"><span>{translateText(locale, "Role")}</span><select onChange={(event) => setMemberRole(event.target.value)} value={memberRole}><option>{translateText(locale, "Owner")}</option><option>{translateText(locale, "Recruiter")}</option><option>{translateText(locale, "Hiring manager")}</option><option>{translateText(locale, "Coordinator")}</option></select></label><label className="field"><span>{translateText(locale, "Worker assignment / responsibility")}</span><input maxLength={200} onChange={(event) => setMemberAssignment(event.target.value)} value={memberAssignment} /></label><button className="button button-primary button-small" disabled={!memberName.trim()} type="submit">{translateText(locale, "Add demo team member")}</button></form><div className="workflow-record-list">{team.map((member, index) => <article className="workflow-record" key={`${member.name}-${index}`}><div className="workflow-record-top"><h3>{member.name}</h3><span className="dash-status blue">{translateText(locale, "Demo access only")}</span></div><div className="workflow-form"><label className="field"><span>{translateText(locale, "Role")}</span><select aria-label={`${member.name} ${translateText(locale, "Role")}`} onChange={(event) => updateTeamMember(index, "role", event.target.value)} value={member.role}><option>{translateText(locale, "Owner")}</option><option>{translateText(locale, "Recruiter")}</option><option>{translateText(locale, "Hiring manager")}</option><option>{translateText(locale, "Coordinator")}</option></select></label><label className="field"><span>{translateText(locale, "Worker assignment / responsibility")}</span><select aria-label={`${member.name} ${translateText(locale, "Worker assignment / responsibility")}`} onChange={(event) => updateTeamMember(index, "assignment", event.target.value)} value={member.assignment}>{Array.from(new Set([member.assignment, "Unassigned", ...marketplaceJobs.filter((job) => job.company === profile.name).map((job) => job.title)])).map((assignment) => <option key={assignment}>{assignment}</option>)}</select></label></div><div className="workflow-actions"><button className="table-action danger-action" onClick={() => removeTeamMember(index)} type="button">{translateText(locale, "Remove member")}</button></div></article>)}</div></section>
  const pipeline = ["submitted", "review", "shortlisted", "interview", "selected", "declined"].map((stage) => ({ stage, count: visibleApps.filter((item) => item.stage === stage).length }))
  return <section className="section-page-card workflow-panel"><div className="workflow-panel-heading"><div><h2>{translateText(locale, "Recruitment analytics")}</h2><p>{translateText(locale, "Sample pipeline metrics generated from the shared demo applications.")}</p></div></div><div className="metric-grid">{pipeline.map((item) => <article className="metric-card" key={item.stage}><span>{translateText(locale, item.stage)}</span><strong>{item.count}</strong><small>{translateText(locale, "demo candidates")}</small></article>)}</div><div className="workflow-record-list">{marketplaceJobs.filter((job) => job.company === profile.name).map((job) => <article className="workflow-record" key={job.id}><h3>{job.title}</h3><p>{job.applicants}  {translateText(locale, "sample applicants ·")} {job.moderationStatus ?? "approved"}</p></article>)}</div></section>
}
