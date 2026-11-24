"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, ChevronRight, Clock3, MapPin, Phone, Search, ShieldCheck, UserRound, Users, X } from "lucide-react"
import { DashboardPage } from "./dashboard"
import { BookingDialog, CategoriesPage, HomePage, InfoPage, JobDetailPage, JobsPage, SearchPage, ServiceDetailPage, WorkerProfilePage } from "./marketplace"
import { Brand, Footer, SiteHeader, Toast } from "./shared"
import { applications as initialApplications, businessProfiles, categories, initialBookings, jobs, services, workers, type ApplicationRecord, type BusinessProfile as BusinessProfileRecord, type DemoBooking, type Job, type Locale, type MarketplaceService, type Worker } from "@/lib/carava-data"
import { publishDemoNotification, sendDemoInboxMessage, sendDemoSupportMessage, useDemoNotifications } from "@/lib/carava-demo-activity"
import { accountTypeKey, isPhoneValid, parseAccountType, phoneKey, profileKeyFor, readAccountType, readOnboardingProfile, roleForAccountType, signedInKey, writeOnboardingProfile } from "@/lib/carava-demo-session"
import { t, translateText } from "@/lib/carava-i18n"
import { createDemoId, transitionApplication, transitionBooking } from "@/lib/carava-workflows"
import { readDemoStorageSnapshot, useDemoStorageState, writeDemoStorageSnapshot } from "@/lib/use-demo-storage-state"
import { useDialogFocus } from "@/lib/use-dialog-focus"

const savedKey = "carava-demo-saved-workers"
const bookingKey = "carava-demo-bookings"
const jobsKey = "carava-demo-marketplace-jobs"
const applicationsKey = "carava-demo-marketplace-applications"

export function CaravaApp() {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const [locale, setLocale] = useDemoStorageState<Locale>("carava-demo-locale", "am")
  const [savedIds, setSavedIds] = useDemoStorageState<string[]>(savedKey, [])
  const [bookings, setBookings] = useDemoStorageState(bookingKey, initialBookings)
  const [marketplaceJobs, setMarketplaceJobs] = useDemoStorageState(jobsKey, jobs)
  const [jobApplications, setJobApplications] = useDemoStorageState(applicationsKey, initialApplications)
  const [accountTypeValue] = useDemoStorageState(accountTypeKey, "customer")
  const [accountName] = useDemoStorageState(profileKeyFor("account"), "Mekdes Alemu")
  const [signedIn, setSignedIn] = useDemoStorageState(signedInKey, false)
  const [businessProfile] = useDemoStorageState<BusinessProfileRecord>("carava-demo-business-profile", businessProfiles[0])
  const applyingJobsRef = useRef(new Set<string>())
  const [toastMessage, setToastMessage] = useState("")
  const [bookingWorker, setBookingWorker] = useState<Worker | null>(null)
  const [bookingService, setBookingService] = useState<MarketplaceService | null>(null)
  const [messageTarget, setMessageTarget] = useState<{ author: string; recipients: ("account" | "worker" | "business" | "admin")[]; subject: string } | null>(null)
  const [reportTarget, setReportTarget] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dataset.caravaReady = "true"
  }, [locale])

  useEffect(() => {
    if (!toastMessage) return
    const timeout = window.setTimeout(() => setToastMessage(""), 3800)
    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  const showToast = (message: string) => setToastMessage(translateText(locale, message))
  const changeLocale = (next: Locale) => setLocale(next)
  const currentAccountType = parseAccountType(accountTypeValue)
  const workspaceHref = `/${roleForAccountType(currentAccountType)}`
  const { unreadCount } = useDemoNotifications(roleForAccountType(currentAccountType), locale)
  const signOut = () => { setSignedIn(false); showToast("Demo signed out. No live session was ended.") }
  const openMessage = (author: string, recipients: ("account" | "worker" | "business" | "admin")[], subject: string) => setMessageTarget({ author, recipients, subject })
  const openReport = (subject: string) => setReportTarget(subject)
  const closeBooking = () => { setBookingWorker(null); setBookingService(null) }
  const toggleSaved = (id: string) => {
    const wasSaved = savedIds.includes(id)
    setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    showToast(wasSaved ? "Removed from your saved professionals." : "Saved to your professional list.")
  }
  const openSearch = (query: string, location = "") => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (location.trim()) params.set("location", location.trim())
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`)
  }
  const updateBooking = (id: string, status: DemoBooking["status"], update: Partial<Pick<DemoBooking, "date" | "schedule" | "details" | "completionEvidence">> = {}) => {
    const currentBooking = bookings.find((booking) => booking.id === id)
    const transitioned = currentBooking && transitionBooking(currentBooking, status, update)
    if (!transitioned) {
      showToast(`That booking cannot move to ${status.toLowerCase()} from its current status.`)
      return
    }
    const next = bookings.map((booking) => booking.id === id ? transitioned : booking)
    setBookings(next)
    publishDemoNotification(["account", "worker"], `Demo booking ${id} moved to ${status.toLowerCase()}.`)
    showToast(`Demo booking status updated to ${status.toLowerCase()}.`)
  }
  const confirmBooking = (worker: Worker, date: string, schedule: string, details: string) => {
    const serviceTitle = bookingService?.title ?? details
    const booking: DemoBooking = { id: createDemoId("BK"), worker: worker.name, workerId: worker.id, customer: accountName, service: serviceTitle, details, date, schedule, status: "Requested", amount: bookingService?.price ?? worker.hourlyRate }
    setBookings((current) => [booking, ...current])
    closeBooking()
    publishDemoNotification(["account", "worker"], `New demo service request with ${worker.name} was added.`)
    showToast("Your demo service request was added. No message or payment was sent.")
    router.push("/account/bookings")
  }
  const createJob = (title: string, description: string, category = "Waiters", owner: "business" | "customer" = "business") => {
    const companyName = owner === "customer" ? accountName : businessProfile.name
    const job: Job = { id: createDemoId("job"), title, company: companyName, ...(owner === "business" ? { businessId: businessProfile.id } : {}), category, location: "Bole, Adama", type: owner === "customer" ? "One-time" : "Full-time", salary: owner === "customer" ? "Discuss in demo" : "ETB 6,000–8,000 / month", posted: "Just now", description: description || "A new local opportunity. Discuss schedule and details with the employer.", applicants: 0, verified: false, moderationStatus: "pending" }
    setMarketplaceJobs((current) => [job, ...current])
    publishDemoNotification("worker", `New demo vacancy: ${title}.`)
    showToast("Vacancy saved as pending demo moderation. It is not public yet.")
  }
  const updateJob = (id: string, title: string, description: string, category?: string) => {
    setMarketplaceJobs((current) => current.map((job) => job.id === id ? { ...job, title: title.trim(), description: description.trim(), ...(category ? { category } : {}), moderationStatus: "pending" as const, posted: "Edited just now" } : job))
    publishDemoNotification(["business", "admin"], `Demo vacancy ${id} was edited and returned to review.`)
    showToast("Vacancy edits saved as pending demo moderation.")
  }
  const updateJobStatus = (id: string, status: NonNullable<Job["moderationStatus"]>) => {
    setMarketplaceJobs((current) => current.map((job) => job.id.toLowerCase() === id.toLowerCase() ? { ...job, moderationStatus: status } : job))
    publishDemoNotification(["worker", "business"], `A demo vacancy was marked ${status}.`)
  }
  const applyToJob = (job: Job) => {
    if (applyingJobsRef.current.has(job.id)) return
    if (jobApplications.some((application) => application.jobId === job.id && application.workerId === "abebe-tadesse" && application.stage !== "declined")) {
      showToast("You already have a demo application for this role.")
      return
    }
    applyingJobsRef.current.add(job.id)
    window.setTimeout(() => applyingJobsRef.current.delete(job.id), 0)
    const application: ApplicationRecord = { id: createDemoId("APP"), jobId: job.id, workerId: "abebe-tadesse", employer: job.company, stage: "submitted", submittedAt: new Date().toISOString() }
    setJobApplications((current) => [application, ...current])
    setMarketplaceJobs((current) => current.map((item) => item.id === job.id ? { ...item, applicants: item.applicants + 1 } : item))
    publishDemoNotification("business", `New demo application for ${job.title}.`)
    showToast(`Demo application submitted for ${job.title}. No message was sent.`)
  }
  const updateApplicationStage = (id: string, stage: ApplicationRecord["stage"]) => {
    const current = jobApplications.find((application) => application.id === id)
    const transitioned = current && transitionApplication(current, stage)
    if (!transitioned) {
      showToast("That application cannot move to the requested stage from its current status.")
      return
    }
    setJobApplications((records) => records.map((application) => application.id === id ? transitioned : application))
    publishDemoNotification(["worker", "business"], `Demo application ${id} moved to ${stage}.`)
  }
  const publicJobs = marketplaceJobs.filter((job) => job.moderationStatus !== "pending" && job.moderationStatus !== "rejected")

  const dashboardMatch = pathname.match(/^\/(account|worker|business|admin)(?:\/|$)/)
  const role = dashboardMatch?.[1] as "account" | "worker" | "business" | "admin" | undefined
  if (role) return <><DashboardPage applications={jobApplications} bookings={bookings} displayName={role === "business" ? businessProfile.name : role === "worker" ? "Abebe Tadesse" : role === "admin" ? "Carava Admin" : accountName} jobs={marketplaceJobs} locale={locale} onApplyJob={applyToJob} onCreateJob={createJob} onUpdateJob={updateJob} onLocaleChange={changeLocale} onToast={showToast} onToggleSave={toggleSaved} onUpdateApplication={updateApplicationStage} onUpdateBooking={updateBooking} onUpdateJobStatus={updateJobStatus} pathname={pathname} role={role} savedIds={savedIds} /><Toast locale={locale} message={toastMessage} onClose={() => setToastMessage("")} /></>

  const parts = pathname.split("/").filter(Boolean)
  const page = parts[0] ?? "home"
  const detailId = parts[1] ?? ""
  const selectedWorker = workers.find((worker) => worker.id === detailId)
  const selectedJob = publicJobs.find((job) => job.id === detailId)
  const selectedService = services.find((service) => service.id === detailId)
  const selectedBusiness = businessProfiles.find((business) => business.id === detailId)
  let content: React.ReactNode
  if (page === "home") content = <HomePage jobs={publicJobs} locale={locale} onSearch={openSearch} onToggleSave={toggleSaved} savedIds={savedIds} />
  else if (page === "search") content = <SearchPage locale={locale} onToggleSave={toggleSaved} savedIds={savedIds} />
  else if (page === "categories") content = <CategoriesPage locale={locale} />
  else if (page === "jobs" && detailId && selectedJob) content = <JobDetailPage isApplied={jobApplications.some((application) => application.jobId === selectedJob.id && application.workerId === "abebe-tadesse" && application.stage !== "declined")} job={selectedJob} locale={locale} onApply={() => applyToJob(selectedJob)} onToast={showToast} />
  else if (page === "jobs" && detailId) content = <NotFound locale={locale} />
  else if (page === "jobs") content = <JobsPage appliedJobIds={jobApplications.filter((application) => application.workerId === "abebe-tadesse" && application.stage !== "declined").map((application) => application.jobId)} jobs={publicJobs} locale={locale} onApplyJob={applyToJob} />
  else if (page === "workers" && detailId && selectedWorker) content = <WorkerProfilePage locale={locale} onBook={() => { setBookingService(null); setBookingWorker(selectedWorker) }} onMessage={() => openMessage(accountName, ["worker"], `${selectedWorker.name} profile inquiry`)} onReport={() => openReport(selectedWorker.name)} onToggleSave={toggleSaved} savedIds={savedIds} worker={selectedWorker} />
  else if (page === "workers" && detailId) content = <NotFound locale={locale} />
  else if (page === "services" && detailId && selectedService) { const worker = workers.find((item) => item.id === selectedService.providerId); content = worker ? <ServiceDetailPage locale={locale} onBook={() => { setBookingService(selectedService); setBookingWorker(worker) }} serviceId={detailId} /> : <NotFound locale={locale} /> }
  else if (page === "services" && detailId) content = <NotFound locale={locale} />
  else if (page === "businesses" && detailId && selectedBusiness) content = <BusinessProfile business={detailId === "sample-business" ? businessProfile : selectedBusiness} jobs={publicJobs} locale={locale} onMessage={() => openMessage(accountName, ["business"], `${selectedBusiness.name} inquiry`)} />
  else if (page === "businesses" && detailId) content = <NotFound locale={locale} />
  else if (["login", "register", "forgot-password", "verify", "onboarding"].includes(page)) content = <AuthPage key={page} mode={page} locale={locale} onToast={showToast} router={router} />
  else if (["about", "help", "contact", "privacy", "terms"].includes(page)) content = <InfoPage key={page} locale={locale} onSend={sendDemoSupportMessage} page={page} />
  else content = <NotFound locale={locale} />

  return <><SiteHeader locale={locale} onLocaleChange={changeLocale} onSignOut={signOut} signedIn={signedIn} unreadCount={unreadCount} workspaceHref={workspaceHref} />{content}<Footer locale={locale} /><BookingDialog locale={locale} onClose={closeBooking} onConfirm={confirmBooking} service={bookingService} worker={bookingWorker} /><DemoMessageDialog locale={locale} onClose={() => setMessageTarget(null)} onSend={(body) => { if (messageTarget) { sendDemoInboxMessage(messageTarget.recipients, messageTarget.author, body, "public", messageTarget.subject); publishDemoNotification(messageTarget.recipients, `New demo message: ${messageTarget.subject}`, body.slice(0, 120)); showToast("Demo message saved in this browser.") } setMessageTarget(null) }} target={messageTarget} /><DemoReportDialog locale={locale} onClose={() => setReportTarget(null)} onSend={(reason) => { if (reportTarget) { sendDemoInboxMessage(["admin"], accountName, `${reportTarget}: ${reason}`, "public", "Profile report"); publishDemoNotification("admin", `Demo report received for ${reportTarget}`, reason) } showToast("Demo report saved in this browser."); setReportTarget(null) }} target={reportTarget} /><Toast locale={locale} message={toastMessage} onClose={() => setToastMessage("")} /></>
}

function BusinessProfile({ business, jobs: marketplaceJobs, locale, onMessage }: { business: BusinessProfileRecord; jobs: Job[]; locale: Locale; onMessage: () => void }) {
  const companyJobs = marketplaceJobs.filter((job) => job.businessId === business.id || job.company === business.name || (business.id === "sample-business" && job.company === businessProfiles[0].name))
  const firstJobHref = companyJobs[0] ? `/jobs/${companyJobs[0].id}` : "/jobs"
  return <main className="page-wrap"><div className="page-content"><div className="breadcrumb"><Link href="/">{t(locale, "home")}</Link><ChevronRight size={13} /><span>{translateText(locale, "Business profile")}</span></div><section className="detail-card business-profile-header"><div className="business-logo"><Building2 size={28} /></div><div><span className="status-pill"><BadgeCheck size={12} /> {translateText(locale, "Demo business profile")}</span><h1>{business.name}</h1><div className="job-meta"><span><MapPin size={13} /> {business.neighborhood}{translateText(locale, ", Adama")}</span><span><BriefcaseBusiness size={13} /> {business.industry}</span><span><Users size={13} /> {business.activeVacancies} {translateText(locale, "open roles")}</span></div></div></section><div className="detail-grid business-profile-grid"><div><section className="detail-card"><h2>{translateText(locale, "A little about us")}</h2><p>{business.description}</p><div className="pill-row"><span className="pill">{translateText(locale, "Locally owned")}</span><span className="pill">{business.industry}</span><span className="pill">{translateText(locale, "Adama")}</span></div></section><section className="detail-card"><h2>{translateText(locale, "Current opportunities")}</h2>{companyJobs.length ? companyJobs.map((job) => <Link className="business-job-row" href={`/jobs/${job.id}`} key={job.id}><span><strong>{job.title}</strong><small>{job.type} · {job.location} · {job.salary}</small></span><ArrowRight size={16} /></Link>) : <p>{translateText(locale, "No public opportunities are listed right now.")}</p>}</section><section className="detail-card"><h2>{translateText(locale, "Our approach")}</h2><p>{translateText(locale, "We believe good work comes from clear expectations, a respectful team, and a chance to grow. We welcome local applicants with a range of experience.")}</p></section></div><aside className="detail-sidebar"><div className="detail-card"><span className="eyebrow">{translateText(locale, "WORK WITH US")}</span><h2>{translateText(locale, "Find your place on our team.")}</h2><p>{translateText(locale, "Explore our open roles and start a demo application.")}</p><Link className="button button-primary full-width" href={firstJobHref}>{translateText(locale, "View open role")} <ArrowRight size={14} /></Link><button className="button button-outline full-width" onClick={onMessage} type="button">{translateText(locale, "Contact business")} <Phone size={14} /></button><p className="small-demo-note">{translateText(locale, "This is illustrative business information, not a real employer listing.")}</p></div></aside></div></div></main>
}

function AuthPage({ mode, locale, onToast, router }: { mode: string; locale: Locale; onToast: (message: string) => void; router: ReturnType<typeof useRouter> }) {
  const [storedAccountType, setStoredAccountType] = useDemoStorageState(accountTypeKey, "customer")
  const [storedStep, setStep] = useDemoStorageState("carava-demo-onboarding-step", 1)
  const step = Math.min(3, Math.max(1, Math.trunc(Number(storedStep) || 1)))
  const [phone, setPhone] = useDemoStorageState(phoneKey, "")
  const [name, setName] = useState(() => readDemoStorageSnapshot(profileKeyFor(roleForAccountType(readAccountType())), ""))
  const [category, setCategory] = useState(() => readOnboardingProfile()?.category ?? "")
  const [neighborhood, setNeighborhood] = useState(() => readOnboardingProfile()?.neighborhood ?? "")
  const [submitted, setSubmitted] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [formError, setFormError] = useState("")
  const accountType = parseAccountType(storedAccountType)
  const setAccountType = (next: string) => setStoredAccountType(next)
  const isRegister = mode === "register"
  const isOnboarding = mode === "onboarding"
  const heading = mode === "login" ? t(locale, "signIn") : mode === "register" ? translateText(locale, "A good next step starts here.") : mode === "forgot-password" ? translateText(locale, "Let's get you back in.") : mode === "verify" ? translateText(locale, "Let's make sure it's you.") : translateText(locale, "A few details, then you're on your way.")
  const subheading = mode === "login" ? translateText(locale, "Sign in to manage your requests, work, and opportunities.") : mode === "register" ? translateText(locale, "Choose how you want to use Carava. You can always add more later.") : mode === "forgot-password" ? translateText(locale, "Enter your phone number and we'll show you the demo recovery steps.") : mode === "verify" ? translateText(locale, "Enter the example code 1234 to continue. No real OTP is sent.") : translateText(locale, "Tell us a little about yourself so we can set up your Carava profile.")
  const finish = (destination: string, message: string) => { onToast(message); router.push(destination) }
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError("")
    if ((mode === "login" || isRegister || mode === "forgot-password" || mode === "verify") && !isPhoneValid(phone)) {
      setFormError("Enter a valid phone number using 9 to 15 digits. No message is sent.")
      return
    }
    if (mode === "login") {
      const savedAccountType = readAccountType()
      writeDemoStorageSnapshot(signedInKey, true)
      finish(`/${roleForAccountType(savedAccountType)}`, "Signed in to the demo workspace. No real authentication was performed.")
    } else if (isRegister) {
      router.push("/verify")
    } else if (mode === "forgot-password") setSubmitted(true)
    else if (mode === "verify") {
      if (verificationCode !== "1234") {
        setFormError("Use the demo code 1234. No real phone verification takes place.")
        return
      }
      writeDemoStorageSnapshot(signedInKey, true)
      finish("/onboarding", "Demo code accepted. No phone verification took place.")
    } else if (isOnboarding && step < 3) {
      setStep(step + 1)
    } else if (isOnboarding) {
      writeOnboardingProfile(accountType, name, category, neighborhood)
      setStep(1)
      finish(`/${roleForAccountType(accountType)}`, "Your demo profile is ready. Verification is still pending and no documents were submitted.")
    }
  }
  return <main className="auth-page"><section aria-labelledby="auth-title" className="auth-card"><Brand locale={locale} /><div className="eyebrow">{translateText(locale, "A WARM WELCOME TO ADAMA'S WORK COMMUNITY")}</div><h1 id="auth-title">{heading}</h1><p>{subheading}</p>{(isOnboarding || isRegister) && <div className="demo-banner auth-demo-banner"><ShieldCheck size={15} /><span>{translateText(locale, isOnboarding ? "Onboarding demo — details are not sent to a backend or verification team." : "Demo account setup — no real authentication or OTP will be created.")}</span></div>}
    {isRegister && <div aria-label={translateText(locale, "Choose your account type")} className="choice-grid">{[["customer", "Find help", "Book a local professional", UserRound], ["worker", "Find work", "Share your skills and services", BriefcaseBusiness], ["business", "Hire a team", "Manage business vacancies", Building2]].map(([id, label, description, Icon]) => <button aria-pressed={accountType === id} className="choice-card" key={String(id)} onClick={() => setAccountType(String(id))} type="button"><span className="choice-card-icon"><Icon size={17} /></span><span><strong>{translateText(locale, label as string)}</strong><small>{translateText(locale, description as string)}</small></span><span className="choice-radio">{accountType === id && <Check size={13} />}</span></button>)}</div>}
    {isOnboarding && <div aria-label={`${translateText(locale, "Step")} ${step} ${translateText(locale, "of")} 3`} className="progress-row">{[1, 2, 3].map((number) => <span aria-current={number === step ? "step" : undefined} className={`progress-step ${number <= step ? "active" : ""}`} key={number} />)}</div>}
    {!submitted ? <form className="auth-form" onSubmit={submit}>{(mode === "login" || mode === "register" || mode === "forgot-password" || mode === "verify") && <label className="field"><span>{translateText(locale, "Phone number")}</span><input autoComplete="tel" onChange={(event) => setPhone(event.target.value)} placeholder="+251 9XX XXX XXX" required type="tel" value={phone} /></label>}{mode === "login" && <label className="field"><span>{translateText(locale, "Password")}</span><input autoComplete="current-password" minLength={6} required type="password" /></label>}{isOnboarding && step === 1 && <><label className="field"><span>{translateText(locale, "Your name")}</span><input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder={translateText(locale, "Name you use every day")} required value={name} /></label><label className="field"><span>{translateText(locale, "Account type")}</span><select onChange={(event) => setAccountType(event.target.value)} value={accountType}><option value="customer">{translateText(locale, "Customer")}</option><option value="worker">{translateText(locale, "Individual worker / job seeker")}</option><option value="business">{translateText(locale, "Business / service company")}</option></select></label></>}{isOnboarding && step === 2 && <><label className="field"><span>{translateText(locale, "What do you do?")}</span><select onChange={(event) => setCategory(event.target.value)} required value={category}><option value="">{translateText(locale, "Choose a starting category")}</option>{categories.flatMap((category) => category.subcategories).map((item) => <option key={item} value={item}>{translateText(locale, item)}</option>)}</select></label><label className="field"><span>{translateText(locale, "Your neighborhood")}</span><select onChange={(event) => setNeighborhood(event.target.value)} required value={neighborhood}><option value="">{translateText(locale, "Choose an Adama neighborhood")}</option>{["Bole", "Ganda", "Kebele 04", "Kebele 09", "Mebrat Hayl", "Tulu Dimtu", "Shoa Ber", "Dabe"].map((item) => <option key={item} value={item}>{translateText(locale, item)}</option>)}</select></label></>}{isOnboarding && step === 3 && <div className="verification-pending"><div className="pending-icon"><Clock3 size={20} /></div><strong>{translateText(locale, "One last thing: profile review")}</strong><p>{translateText(locale, "Your demo profile will show as pending review. No identification documents or sensitive information are uploaded here.")}</p><span className="dash-status">{translateText(locale, "Pending review")}</span></div>}{mode === "verify" && <><label className="field"><span>{translateText(locale, "Demo verification code")}</span><input autoComplete="one-time-code" inputMode="numeric" maxLength={4} onChange={(event) => { setVerificationCode(event.target.value); setFormError("") }} pattern="[0-9]{4}" placeholder="1234" required value={verificationCode} /></label></>}{mode === "login" && <Link className="auth-forgot" href="/forgot-password">{translateText(locale, "Forgot password?")}</Link>}{formError && <p aria-live="polite" className="form-error" role="alert">{translateText(locale, formError)}</p>}<button className="button button-primary" type="submit">{translateText(locale, mode === "login" ? "Sign in to demo" : mode === "forgot-password" ? "Show recovery steps" : mode === "verify" ? "Continue with demo code" : isOnboarding ? step < 3 ? "Continue" : "Finish demo profile" : "Continue")}<ArrowRight size={15} /></button>{isOnboarding && step > 1 && <button className="button button-quiet" onClick={() => setStep(Math.max(1, step - 1))} type="button">{t(locale, "back")}</button>}</form> : <div className="recovery-success"><span><Check size={19} /></span><h2>{translateText(locale, "Demo recovery started")}</h2><p>{translateText(locale, "No text message has been sent. In a live service, recovery steps would be delivered securely to your verified phone.")}</p><Link className="button button-outline" href="/login">{translateText(locale, "Return to sign in")}</Link></div>}
    {isRegister && <div className="auth-switch">{translateText(locale, "Already have an account?")} <Link href="/login">{t(locale, "login")}</Link></div>}{mode === "login" && <div className="auth-switch">{translateText(locale, "New to Carava?")} <Link href="/register">{translateText(locale, "Create an account")}</Link></div>}{mode === "register" && <p className="auth-legal">{translateText(locale, "By continuing, you agree to our")} <Link href="/terms">{translateText(locale, "demo terms")}</Link> {translateText(locale, "and")} <Link href="/privacy">{translateText(locale, "privacy notice")}</Link>.</p>}</section></main>
}

function NotFound({ locale }: { locale: Locale }) { return <main className="page-wrap"><div className="page-content"><div className="empty-state"><div className="empty-state-icon"><Search size={20} /></div><h2>{translateText(locale, "We couldn't find that page")}</h2><p>{translateText(locale, "Try a new search or head back to the marketplace to find your next good thing.")}</p><Link className="button button-primary" href="/">{translateText(locale, "Back to Carava")} <ArrowRight size={14} /></Link></div></div></main> }

type DemoMessageTarget = { author: string; recipients: ("account" | "worker" | "business" | "admin")[]; subject: string }

function DemoMessageDialog({ locale, onClose, onSend, target }: { locale: Locale; onClose: () => void; onSend: (body: string) => void; target: DemoMessageTarget | null }) {
  const [body, setBody] = useState("")
  const targetKey = target ? `${target.author}|${target.recipients.join(",")}|${target.subject}` : ""
  const [syncedTargetKey, setSyncedTargetKey] = useState(targetKey)
  if (syncedTargetKey !== targetKey) {
    setSyncedTargetKey(targetKey)
    setBody("")
  }
  const dialogRef = useDialogFocus(Boolean(target), onClose)
  if (!target) return null
  return <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby="demo-message-title" aria-modal="true" className="confirm-dialog" ref={dialogRef} role="dialog" tabIndex={-1}><button aria-label={translateText(locale, "Close")} className="dialog-close icon-button" onClick={onClose} type="button"><X size={17} /></button><div className="eyebrow">{translateText(locale, "DEMO MESSAGE")}</div><h2 id="demo-message-title">{translateText(locale, "Message")} · {target.subject}</h2><p>{translateText(locale, "Demo only — nothing is sent to a live service.")}</p><form className="auth-form" onSubmit={(event) => { event.preventDefault(); if (!body.trim()) return; onSend(body); setBody("") }}><label className="field"><span>{translateText(locale, "Your message")}</span><textarea onChange={(event) => setBody(event.target.value)} placeholder={translateText(locale, "Write a short demo message")} required value={body} /></label><button className="button button-primary" disabled={!body.trim()} type="submit">{translateText(locale, "Send")} <ArrowRight size={14} /></button></form></section></div>
}

function DemoReportDialog({ locale, onClose, onSend, target }: { locale: Locale; onClose: () => void; onSend: (reason: string) => void; target: string | null }) {
  const [reason, setReason] = useState("")
  const targetKey = target ?? ""
  const [syncedTargetKey, setSyncedTargetKey] = useState(targetKey)
  if (syncedTargetKey !== targetKey) {
    setSyncedTargetKey(targetKey)
    setReason("")
  }
  const dialogRef = useDialogFocus(Boolean(target), onClose)
  if (!target) return null
  return <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section aria-labelledby="demo-report-title" aria-modal="true" className="confirm-dialog" ref={dialogRef} role="dialog" tabIndex={-1}><button aria-label={translateText(locale, "Close")} className="dialog-close icon-button" onClick={onClose} type="button"><X size={17} /></button><div className="eyebrow">{translateText(locale, "DEMO REPORT")}</div><h2 id="demo-report-title">{translateText(locale, "Report")} · {target}</h2><p>{translateText(locale, "Demo only — nothing is sent to a live service.")}</p><form className="auth-form" onSubmit={(event) => { event.preventDefault(); if (!reason.trim()) return; onSend(reason); setReason("") }}><label className="field"><span>{translateText(locale, "Reason")}</span><textarea onChange={(event) => setReason(event.target.value)} placeholder={translateText(locale, "Describe the issue")} required value={reason} /></label><button className="button button-primary" disabled={!reason.trim()} type="submit">{translateText(locale, "Send")} <ArrowRight size={14} /></button></form></section></div>
}
