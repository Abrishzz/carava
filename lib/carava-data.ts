export type Locale = "am" | "om" | "en"
export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended"
export type EmploymentType = "One-time" | "Daily" | "Temporary" | "Part-time" | "Full-time" | "Recurring" | "Project contract"

export interface Category {
  id: string
  name: string
  description: string
  icon: string
  count: number
  subcategories: string[]
}

export interface Worker {
  id: string
  name: string
  headline: string
  category: string
  location: string
  distanceKm?: number
  rating: number
  reviewCount: number
  hourlyRate: number
  experience: number
  verified: boolean
  available: boolean
  languages: string[]
  skills: string[]
  about: string
  initials: string
  joinedAt?: string
}

export interface Job {
  id: string
  moderationStatus?: "pending" | "approved" | "rejected"
  title: string
  businessId?: string
  company: string
  category: string
  location: string
  type: EmploymentType
  salary: string
  posted: string
  description: string
  applicants: number
  verified: boolean
}

export interface MarketplaceService {
  id: string
  title: string
  category: string
  provider: string
  providerId: string
  price: number
  unit: string
  rating: number
  location: string
}

export type BookingStatus = "Requested" | "Confirmed" | "In progress" | "Completed" | "Cancelled" | "Reschedule requested" | "Completion submitted"

export interface DemoBooking {
  id: string
  worker: string
  workerId?: string
  customer?: string
  service: string
  details?: string
  date: string
  schedule?: string
  completionEvidence?: string
  status: BookingStatus
  amount: number
}

export const neighborhoods = ["Bole", "Ganda", "Kebele 04", "Kebele 09", "Mebrat Hayl", "Tulu Dimtu", "Shoa Ber", "Dabe"]

export const categories: Category[] = [
  { id: "trades", name: "Skilled trades", description: "Trusted hands for repairs, building, and home projects.", icon: "hammer", count: 184, subcategories: ["Electricians", "Plumbers", "Mechanics", "Carpenters", "Painters", "Welders", "Technicians"] },
  { id: "household", name: "Household services", description: "Reliable support for a happier, easier home.", icon: "home", count: 246, subcategories: ["Cleaners", "Cooks", "Babysitters", "Gardeners", "Laundry workers", "Housekeepers"] },
  { id: "transport", name: "Transport & delivery", description: "Get there, or get it delivered, with ease.", icon: "truck", count: 112, subcategories: ["Drivers", "Motorcycle riders", "Delivery workers", "Movers"] },
  { id: "construction", name: "Construction & labor", description: "Skilled and dependable teams for every site.", icon: "building", count: 308, subcategories: ["Loaders", "Construction workers", "General laborers", "Helpers"] },
  { id: "professional", name: "Professional & digital", description: "Creative, technical, and business expertise.", icon: "briefcase", count: 97, subcategories: ["Graphic designers", "Photographers", "Tutors", "Translators", "Accountants", "IT technicians"] },
  { id: "hospitality", name: "Business & hospitality", description: "Great people who make every guest feel welcome.", icon: "coffee", count: 156, subcategories: ["Waiters", "Shop assistants", "Receptionists", "Hotel workers", "Security guards"] },
]

export const workers: Worker[] = [
  { id: "abebe-tadesse", name: "Abebe Tadesse", headline: "Certified electrician · 8 years experience", category: "Electricians", location: "Bole, Adama", distanceKm: 2.3, rating: 4.9, reviewCount: 42, hourlyRate: 450, experience: 8, verified: true, available: true, languages: ["Amharic", "Afaan Oromo"], skills: ["Residential wiring", "Solar installation", "Safety inspection"], about: "I help Adama families feel safe and comfortable with careful electrical work, clear communication, and reliable follow-through.", initials: "AT", joinedAt: "2026-01-12" },
  { id: "sara-mekonnen", name: "Sara Mekonnen", headline: "Home chef & event catering", category: "Cooks", location: "Mebrat Hayl, Adama", distanceKm: 4.1, rating: 5.0, reviewCount: 28, hourlyRate: 380, experience: 6, verified: true, available: true, languages: ["Amharic", "English"], skills: ["Ethiopian cuisine", "Meal prep", "Event catering"], about: "Thoughtful, delicious food for family gatherings, celebrations, and everyday meals.", initials: "SM", joinedAt: "2026-03-04" },
  { id: "dawit-bekele", name: "Dawit Bekele", headline: "Master carpenter & furniture maker", category: "Carpenters", location: "Kebele 09, Adama", distanceKm: 6.8, rating: 4.8, reviewCount: 35, hourlyRate: 520, experience: 11, verified: true, available: false, languages: ["Amharic", "Afaan Oromo"], skills: ["Custom furniture", "Cabinetry", "Wood repair"], about: "Handcrafted furniture and thoughtful repairs, made to last with locally sourced materials.", initials: "DB", joinedAt: "2025-11-18" },
  { id: "lemlem-hailu", name: "Lemlem Hailu", headline: "Professional home cleaner", category: "Cleaners", location: "Ganda, Adama", distanceKm: 3.5, rating: 4.9, reviewCount: 51, hourlyRate: 300, experience: 5, verified: true, available: true, languages: ["Amharic", "Afaan Oromo"], skills: ["Deep cleaning", "Move-in cleaning", "Laundry"], about: "A dependable and detail-oriented home care professional, ready to make your space feel fresh again.", initials: "LH", joinedAt: "2026-05-21" },
  { id: "mohammed-ali", name: "Mohammed Ali", headline: "Licensed driver · Safe & punctual", category: "Drivers", location: "Shoa Ber, Adama", distanceKm: 5.2, rating: 4.7, reviewCount: 19, hourlyRate: 500, experience: 7, verified: true, available: true, languages: ["Afaan Oromo", "Amharic"], skills: ["City driving", "Airport transfer", "Delivery"], about: "Safe, punctual city rides with a friendly local driver who knows Adama inside and out.", initials: "MA", joinedAt: "2025-12-09" },
  { id: "hanna-girma", name: "Hanna Girma", headline: "Patient mathematics tutor", category: "Tutors", location: "Kebele 04, Adama", distanceKm: 8.4, rating: 5.0, reviewCount: 16, hourlyRate: 350, experience: 4, verified: false, available: true, languages: ["Amharic", "English"], skills: ["Mathematics", "Exam preparation", "Grades 6–12"], about: "Making mathematics feel approachable with patient one-to-one lessons and a plan for every learner.", initials: "HG", joinedAt: "2026-06-02" },
]

export const jobs: Job[] = [
  { id: "job-1", title: "Experienced Electrician for new café", company: "Kora Coffee House", category: "Electricians", location: "Bole, Adama", type: "Project contract", salary: "ETB 8,000–12,000", posted: "2 hours ago", description: "Looking for a licensed electrician to complete lighting and outlet installation for our new café space. Materials provided.", applicants: 8, verified: true },
  { id: "job-2", title: "Part-time weekend home cook", company: "Private household", category: "Cooks", location: "Mebrat Hayl, Adama", type: "Part-time", salary: "ETB 3,500 / month", posted: "5 hours ago", description: "Prepare lunch and dinner for a family of four each Saturday and Sunday. Ethiopian cuisine preferred.", applicants: 12, verified: false },
  { id: "job-3", title: "Delivery rider — afternoon shift", company: "Guzo Express", category: "Delivery workers", location: "Adama city center", type: "Full-time", salary: "ETB 6,000–9,000 / month", posted: "Yesterday", description: "Join a growing local delivery team. Valid motorcycle license required; company motorbike available.", applicants: 23, verified: true },
  { id: "job-4", title: "Furniture carpenter for growing workshop", company: "Mekdes Interiors", category: "Carpenters", location: "Kebele 09, Adama", type: "Full-time", salary: "ETB 10,000–14,000 / month", posted: "Yesterday", description: "We are adding an experienced carpenter to our small furniture team. Strong finishing skills are a plus.", applicants: 6, verified: true },
  { id: "job-5", title: "Office cleaner, weekday mornings", company: "Horizon Accounting", category: "Cleaners", location: "Shoa Ber, Adama", type: "Recurring", salary: "ETB 450 / day", posted: "2 days ago", description: "Keep a small office tidy each weekday morning. Two to three hours per day; supplies provided.", applicants: 14, verified: false },
  { id: "job-6", title: "Construction helpers needed this week", company: "Abdi Construction", category: "Construction workers", location: "Dabe, Adama", type: "Daily", salary: "ETB 650 / day", posted: "3 days ago", description: "Seeking three dependable helpers for a residential renovation. Lunch and transport allowance included.", applicants: 31, verified: true },
  { id: "job-7", moderationStatus: "pending", title: "Weekend event service team", company: "Kora Coffee House", category: "Waiters", location: "Bole, Adama", type: "Temporary", salary: "ETB 700 / day", posted: "Just now", description: "Join the café team for weekend events. Hospitality experience and friendly service are valued.", applicants: 0, verified: false },
]

export const services: MarketplaceService[] = [
  { id: "svc-1", title: "Home electrical repair & safety check", category: "Electricians", provider: "Abebe Tadesse", providerId: "abebe-tadesse", price: 450, unit: "hour", rating: 4.9, location: "Bole, Adama" },
  { id: "svc-2", title: "Fresh home-cooked meals for your week", category: "Cooks", provider: "Sara Mekonnen", providerId: "sara-mekonnen", price: 1200, unit: "visit", rating: 5.0, location: "Mebrat Hayl, Adama" },
  { id: "svc-3", title: "A full home refresh, room by room", category: "Cleaners", provider: "Lemlem Hailu", providerId: "lemlem-hailu", price: 600, unit: "visit", rating: 4.9, location: "Ganda, Adama" },
]

export const workerPortfolio = [
  { workerId: "abebe-tadesse", title: "Café lighting installation", category: "Commercial electrical", neighborhood: "Bole", summary: "Safe lighting and outlet installation for a new neighborhood café." },
  { workerId: "abebe-tadesse", title: "Home safety inspection", category: "Residential wiring", neighborhood: "Kebele 04", summary: "A careful inspection and small repairs to help a family feel secure." },
  { workerId: "dawit-bekele", title: "Made-to-measure dining set", category: "Custom furniture", neighborhood: "Kebele 09", summary: "A locally made dining table and chairs with a durable natural finish." },
  { workerId: "sara-mekonnen", title: "Family celebration catering", category: "Event catering", neighborhood: "Mebrat Hayl", summary: "A seasonal menu prepared for a small family gathering." },
]

export const workerCredentials = [
  { workerId: "abebe-tadesse", name: "Electrical safety training", issuer: "Adama Technical Training Center", year: "2022", status: "Reviewed in demo" },
  { workerId: "sara-mekonnen", name: "Food preparation & hygiene", issuer: "Local hospitality program", year: "2023", status: "Reviewed in demo" },
  { workerId: "dawit-bekele", name: "Carpentry & joinery", issuer: "Oromia Skills Development", year: "2021", status: "Reviewed in demo" },
]

export const featuredStories = [
  { quote: "We found someone local who really cared about doing the job well.", name: "Mekdes A.", detail: "Adama resident · Demo story" },
  { quote: "My profile helps people see the skills I have built over the years.", name: "Abebe T.", detail: "Electrician · Demo story" },
  { quote: "It is easier to meet dependable people who know our neighborhood.", name: "Kora Coffee House", detail: "Local business · Demo story" },
]

export const faqItems = [
  { question: "Are these real profiles or bookings?", answer: "No. This is a frontend demo with illustrative sample profiles, reviews, and service records. No booking or payment is sent." },
  { question: "How do I find someone near me?", answer: "Search by skill, choose an Adama neighborhood, and use the filters to compare availability, experience, language, and price." },
  { question: "Can I use Carava to find a job?", answer: "Yes. Browse local opportunities on the Jobs page and explore a worker dashboard through the demo workspace switcher." },
]

export const initialBookings: DemoBooking[] = [
  { id: "BK-2041", worker: "Abebe Tadesse", service: "Kitchen light repair", date: "Nov 24, 2026 · 10:00 AM", status: "Confirmed", amount: 900 },
  { id: "BK-2038", worker: "Lemlem Hailu", service: "Home deep clean", date: "Nov 19, 2026 · 9:00 AM", status: "Completed", amount: 1800 },
  { id: "BK-2031", worker: "Sara Mekonnen", service: "Family dinner prep", date: "Nov 28, 2026 · 2:00 PM", status: "Requested", amount: 1200 },
]

export const dashboardSections: Record<string, string[]> = {
  account: ["Overview", "My profile", "Saved workers", "Service requests", "Bookings", "My job posts", "Applications", "Messages", "Notifications", "Payments", "Receipts", "Reviews", "Complaints & disputes", "Settings", "Privacy & data"],
  worker: ["Overview", "My profile", "Skills & categories", "Services & pricing", "Portfolio", "Certificates", "Verification", "Availability calendar", "Job discovery", "Applications", "Invitations", "Bookings", "Messages", "Notifications", "Earnings", "Payouts", "Reviews", "Premium subscription", "Settings"],
  business: ["Overview", "Company profile", "Company verification", "Vacancies", "Applicants", "Candidates", "Recruitment pipeline", "Interviews", "Team members", "Team roles", "Worker assignments", "Bookings", "Messages", "Notifications", "Analytics", "Subscription", "Settings"],
  admin: ["Overview", "Users", "Customers", "Workers", "Businesses", "Worker verification", "Business verification", "Categories", "Subcategories", "Services", "Job approval", "Job management", "Bookings", "Applications", "Recruitment", "Payments", "Transactions", "Commission configuration", "Payouts", "Refunds", "Disputes", "Reviews & moderation", "Messages & support", "Emergency support", "Notifications", "Subscriptions", "Advertisements & promotions", "Locations & service zones", "Roles & permissions", "Audit logs", "Analytics & reports", "Exports", "Platform settings"],
}

export interface DemoUser {
  id: string
  name: string
  role: "customer" | "worker" | "business" | "admin"
  neighborhood: string
  status: "active" | "pending" | "suspended"
  createdAt: string
}

export interface BusinessProfile {
  id: string
  name: string
  industry: string
  neighborhood: string
  verified: boolean
  activeVacancies: number
  description: string
}

export interface ApplicationRecord {
  id: string
  jobId: string
  workerId: string
  employer: string
  stage: "submitted" | "review" | "shortlisted" | "interview" | "selected" | "declined"
  submittedAt: string
}

export interface PaymentRecord {
  id: string
  bookingId: string
  payer: string
  payee: string
  amount: number
  status: "completed" | "pending" | "refunded"
  createdAt: string
}

export interface ReviewRecord {
  id: string
  bookingId: string
  author: string
  workerId: string
  rating: number
  body: string
  status: "published" | "flagged" | "removed"
  createdAt: string
}

export interface NotificationRecord {
  id: string
  userId: string
  title: string
  read: boolean
  createdAt: string
}

export interface DisputeRecord {
  id: string
  bookingId: string
  openedBy: string
  subject: string
  status: "open" | "in-review" | "resolved"
  createdAt: string
}

export type DashboardRow = Record<string, string>

export const demoUsers: DemoUser[] = [
  { id: "USR-104", name: "Mekdes Alemu", role: "customer", neighborhood: "Bole", status: "active", createdAt: "2026-11-19T09:15:00+03:00" },
  { id: "USR-112", name: "Abebe Tadesse", role: "worker", neighborhood: "Bole", status: "active", createdAt: "2026-11-18T14:30:00+03:00" },
  { id: "USR-118", name: "Sara Mekonnen", role: "worker", neighborhood: "Mebrat Hayl", status: "active", createdAt: "2026-11-17T11:00:00+03:00" },
  { id: "USR-126", name: "Hanna Girma", role: "worker", neighborhood: "Kebele 04", status: "pending", createdAt: "2026-11-19T16:45:00+03:00" },
  { id: "USR-130", name: "Kora Coffee House", role: "business", neighborhood: "Bole", status: "pending", createdAt: "2026-11-18T10:20:00+03:00" },
]

export const initialVerificationStatuses: Record<string, string> = {
  "USR-112": "Verified (illustrative)",
  "USR-118": "Verified (illustrative)",
  "USR-126": "Pending review",
  "USR-130": "Not submitted",
}

export const businessProfiles: BusinessProfile[] = [
  { id: "sample-business", name: "Kora Coffee House", industry: "Food & hospitality", neighborhood: "Bole", verified: true, activeVacancies: 2, description: "A neighborhood café bringing locally sourced coffee, thoughtful hospitality, and a welcoming place to gather to Adama." },
  { id: "guzo-express", name: "Guzo Express", industry: "Transport & delivery", neighborhood: "Adama city center", verified: true, activeVacancies: 1, description: "A local delivery team connecting Adama businesses and neighborhoods." },
]

export const applications: ApplicationRecord[] = [
  { id: "APP-204", jobId: "job-1", workerId: "abebe-tadesse", employer: "Kora Coffee House", stage: "review", submittedAt: "2026-11-20T09:30:00+03:00" },
  { id: "APP-196", jobId: "job-4", workerId: "dawit-bekele", employer: "Mekdes Interiors", stage: "shortlisted", submittedAt: "2026-11-18T13:10:00+03:00" },
  { id: "APP-188", jobId: "job-2", workerId: "sara-mekonnen", employer: "Private household", stage: "interview", submittedAt: "2026-11-17T10:00:00+03:00" },
]

export const paymentRecords: PaymentRecord[] = [
  { id: "TX-2041", bookingId: "BK-2041", payer: "Mekdes Alemu", payee: "Abebe Tadesse", amount: 900, status: "completed", createdAt: "2026-11-20T10:00:00+03:00" },
  { id: "TX-2038", bookingId: "BK-2038", payer: "Mekdes Alemu", payee: "Lemlem Hailu", amount: 1800, status: "completed", createdAt: "2026-11-19T12:00:00+03:00" },
  { id: "TX-2025", bookingId: "BK-2031", payer: "Mekdes Alemu", payee: "Sara Mekonnen", amount: 1200, status: "pending", createdAt: "2026-11-17T16:00:00+03:00" },
]

export const reviewRecords: ReviewRecord[] = [
  { id: "RV-192", bookingId: "BK-2038", author: "Mekdes Alemu", workerId: "lemlem-hailu", rating: 5, body: "Clear communication and lovely work.", status: "published", createdAt: "2026-11-19T15:10:00+03:00" },
  { id: "RV-188", bookingId: "BK-2021", author: "Dawit Bekele", workerId: "abebe-tadesse", rating: 2, body: "Arrived later than expected for the appointment.", status: "flagged", createdAt: "2026-11-16T12:00:00+03:00" },
]

export const notificationRecords: NotificationRecord[] = [
  { id: "NT-302", userId: "USR-104", title: "Your booking with Abebe is confirmed for Nov 24.", read: false, createdAt: "2026-11-20T10:15:00+03:00" },
  { id: "NT-298", userId: "USR-104", title: "Sara Mekonnen replied to your service request.", read: true, createdAt: "2026-11-20T09:00:00+03:00" },
  { id: "NT-290", userId: "USR-112", title: "A new electrician role is available in Adama.", read: false, createdAt: "2026-11-19T08:45:00+03:00" },
]

export const disputeRecords: DisputeRecord[] = [
  { id: "DSP-024", bookingId: "BK-2041", openedBy: "Mekdes Alemu", subject: "Schedule disagreement", status: "open", createdAt: "2026-11-19T13:00:00+03:00" },
  { id: "DSP-021", bookingId: "BK-2031", openedBy: "Sara Mekonnen", subject: "Service scope question", status: "in-review", createdAt: "2026-11-16T11:00:00+03:00" },
  { id: "DSP-018", bookingId: "BK-2010", openedBy: "Kora Coffee House", subject: "Booking reschedule", status: "resolved", createdAt: "2026-11-12T10:00:00+03:00" },
]

export const demoAuditRecords: DashboardRow[] = [
  { ID: "AU-441", Name: "Verification record viewed", Admin: "Carava Admin", Date: "Nov 20, 2026 · 09:32", Status: "Recorded" },
  { ID: "AU-440", Name: "Job advertisement approved", Admin: "Carava Admin", Date: "Nov 20, 2026 · 08:17", Status: "Recorded" },
  { ID: "AU-439", Name: "Commission settings viewed", Admin: "Carava Admin", Date: "Nov 19, 2026 · 16:41", Status: "Recorded" },
]

export function dashboardRecords(role: string, section: string, marketplaceJobs: Job[] = jobs, jobApplications: ApplicationRecord[] = applications, demoBookings: DemoBooking[] = initialBookings): DashboardRow[] {
  if (role === "worker" && /portfolio/i.test(section)) return workerPortfolio.filter((item) => item.workerId === "abebe-tadesse").map((item, index) => ({ ID: `PORT-${index + 1}`, Name: item.title, Category: item.category, Neighborhood: item.neighborhood, Detail: item.summary, Status: "Published demo" }))
  if (role === "worker" && /certificate/i.test(section)) return workerCredentials.filter((item) => item.workerId === "abebe-tadesse").map((item, index) => ({ ID: `CERT-${index + 1}`, Name: item.name, Issuer: item.issuer, Year: item.year, Status: item.status }))
  if (role === "worker" && /^verification$/i.test(section)) {
    const worker = workers.find((item) => item.id === "abebe-tadesse")!
    return [{ ID: "USR-112", Name: worker.name, Type: "worker", Submitted: "2026-11-18", Status: worker.verified ? "Verified (illustrative)" : "Pending review" }]
  }
  if (/verif/i.test(section)) {
    const verificationRole = /worker/i.test(section) ? "worker" : /business/i.test(section) ? "business" : undefined
    return demoUsers.filter((user) => verificationRole ? user.role === verificationRole : user.status === "pending").map((user) => ({ ID: user.id, Name: user.name, Type: user.role, Submitted: user.createdAt.slice(0, 10), Status: user.status === "pending" ? "Pending review" : user.status === "suspended" ? "Suspended" : "Verified (illustrative)" }))
  }
  if (/job approval/i.test(section)) return marketplaceJobs.filter((job) => job.moderationStatus === "pending").map((job) => ({ ID: job.id, Title: job.title, Employer: job.company, Location: job.location, Type: job.type, Status: "Pending review" }))
  if (/job management|vacanc|job post|job discovery/i.test(section)) {
    const sectionJobs = role === "business" && /vacanc/i.test(section) ? marketplaceJobs.filter((job) => job.company === "Kora Coffee House") : marketplaceJobs
    return sectionJobs.map((job) => ({ ID: job.id, Title: job.title, Employer: job.company, Location: job.location, Type: job.type, Status: job.moderationStatus === "pending" ? "Pending review" : job.moderationStatus === "rejected" ? "Rejected" : "Active" }))
  }
  if (/dispute|complaint/i.test(section)) return disputeRecords.map((item) => ({ ID: item.id, Name: item.subject, Parties: item.openedBy, Opened: item.createdAt.slice(0, 10), Status: item.status === "in-review" ? "In review" : item.status === "open" ? "Open dispute" : "Resolved" }))
  if (/payment|transaction|refund|payout|earning|receipt/i.test(section)) return paymentRecords.map((item) => ({ ID: item.id, Name: jobs.find((job) => job.id === applications.find((application) => application.id === "APP-204")?.jobId)?.title ?? "Local service", User: item.payer, Date: item.createdAt.slice(0, 10), Amount: formatETB(item.amount), Status: item.status === "completed" ? "Completed" : item.status === "refunded" ? "Refunded" : "Pending" }))
  if (/booking|assignment/i.test(section)) return demoBookings.map((booking) => ({ ID: booking.id, Name: booking.service, Worker: booking.worker, Date: booking.date, Amount: formatETB(booking.amount), Status: booking.status }))
  if (/application|applicant|candidate|recruit|interview/i.test(section)) return jobApplications.map((application) => ({ ID: application.id, Name: workers.find((worker) => worker.id === application.workerId)?.name ?? "Local applicant", Position: marketplaceJobs.find((job) => job.id === application.jobId)?.title ?? application.jobId, Employer: application.employer, Date: application.submittedAt.slice(0, 10), Status: application.stage }))
  if (/review|moderation/i.test(section)) return reviewRecords.map((review) => ({ ID: review.id, Name: review.body, Author: review.author, Rating: String(review.rating), Status: review.status === "flagged" ? "Flagged" : review.status === "removed" ? "Removed" : "Published" }))
  if (/audit/i.test(section)) return demoAuditRecords
  if (/category|service|location|promotion|advertisement|subscription|notification|support|emergency|analytics|export/i.test(section)) {
    if (/categor/i.test(section)) {
      const rows: DashboardRow[] = []
      for (const category of categories) {
        if (section.toLowerCase().includes("subcategor")) rows.push(...category.subcategories.map((name, index) => ({ ID: `SUB-${category.id}-${index + 1}`, Name: name, Category: category.name, Updated: "2026-11-20", Status: "Active" })))
        else rows.push({ ID: category.id, Name: category.name, Detail: category.description, Updated: "2026-11-20", Status: "Active" })
      }
      return rows
    }
    if (/location/i.test(section)) return [{ ID: "LOC-01", Name: "Adama city center", Detail: "Primary service zone", Updated: "2026-11-20", Status: "Active" }, { ID: "LOC-02", Name: "Bole", Detail: "Local sample service area", Updated: "2026-11-19", Status: "Active" }, { ID: "LOC-03", Name: "Kebele 09", Detail: "Illustrative neighborhood", Updated: "2026-11-18", Status: "Pending review" }]
    if (/service/i.test(section)) return services.map((service) => ({ ID: service.id, Name: service.title, Provider: service.provider, Price: formatETB(service.price), Status: "Active" }))
    if (/notification/i.test(section)) return notificationRecords.map((item) => ({ ID: item.id, Name: item.title, User: item.userId, Date: item.createdAt.slice(0, 10), Status: item.read ? "Read" : "Unread" }))
    if (/support|emergency/i.test(section)) return [
      { ID: "SUP-204", Name: "Booking schedule question", User: "Mekdes Alemu", Priority: "Normal", Detail: "Customer asked to confirm an updated appointment time.", Status: "Open" },
      { ID: "SUP-201", Name: "Worker profile review", User: "Abebe Tadesse", Priority: "Normal", Detail: "Worker asked how sample verification status is displayed.", Status: "In review" },
      { ID: "SUP-198", Name: "Urgent booking follow-up", User: "Kora Coffee House", Priority: "High", Detail: "Business requested a same-day scheduling follow-up.", Status: "Pending review" },
    ]
    if (/subscription/i.test(section)) return [
      { ID: "SUB-031", Name: "Worker premium sample", User: "Abebe Tadesse", Plan: "Worker Plus", Amount: "ETB 250 / month", Status: "Active · demo only" },
      { ID: "SUB-029", Name: "Business sample plan", User: "Kora Coffee House", Plan: "Local Business", Amount: "ETB 600 / month", Status: "Pending review" },
    ]
    if (/advertisement|promotion/i.test(section)) return [
      { ID: "PROMO-014", Name: "Featured electrician profiles", Placement: "Search results", Detail: "Illustrative local visibility placement.", Status: "Active" },
      { ID: "PROMO-011", Name: "Weekend event vacancy", Placement: "Jobs page", Detail: "Sample promoted listing pending review.", Status: "Pending review" },
    ]
    if (/analytics/i.test(section)) {
      const verifiedUsers = dashboardRecords("admin", "Worker verification", marketplaceJobs, jobApplications, demoBookings)
      const activeUserIds = new Set([
        ...demoUsers.map((user) => user.id),
        ...jobApplications.map((item) => item.workerId),
        ...demoBookings.map((item) => item.workerId).filter((id): id is string => Boolean(id)),
      ])
      return [
        { ID: "METRIC-01", Name: "Active demo users", Value: String(activeUserIds.size), Period: "Current snapshot", Status: "Illustrative" },
        { ID: "METRIC-02", Name: "Demo service requests", Value: String(demoBookings.length), Period: "Current snapshot", Status: "Illustrative" },
        { ID: "METRIC-03", Name: "Worker verification queue", Value: String(verifiedUsers.filter((row) => /pending/i.test(row.Status ?? "")).length), Period: "Current snapshot", Status: "Illustrative" },
      ]
    }
    if (/export/i.test(section)) return [
      { ID: "EXP-01", Name: "Bookings report", Format: "CSV", Range: "November 2026", Status: "Ready" },
      { ID: "EXP-02", Name: "Recruitment report", Format: "CSV", Range: "Current snapshot", Status: "Ready" },
      { ID: "EXP-03", Name: "Financial demo report", Format: "CSV", Range: "Current snapshot", Status: "Demo only" },
    ]
    return [{ Name: "Adama city center", Detail: "Demo configuration record", Updated: "2026-11-20", Status: "Active" }, { Name: "Bole", Detail: "Local sample data", Updated: "2026-11-19", Status: "Active" }, { Name: "Kebele 09", Detail: "Illustrative record", Updated: "2026-11-18", Status: "Pending review" }]
  }
  if (/role.*permission/i.test(section)) return [
    { ID: "ROLE-OWNER", Name: "Owner", Permissions: "Company profile · team roles · vacancies · analytics", Status: "Active" },
    { ID: "ROLE-RECRUITER", Name: "Recruiter", Permissions: "Vacancies · applicants · interviews", Status: "Active" },
    { ID: "ROLE-SUPPORT", Name: "Support agent", Permissions: "Support queue · booking details · dispute notes", Status: "Pending review" },
  ]
  if (/customer/i.test(section)) return demoUsers.filter((user) => user.role === "customer").map((user) => ({ ID: user.id, Name: user.name, Role: user.role, Location: user.neighborhood, Status: user.status === "pending" ? "Pending review" : user.status === "suspended" ? "Suspended" : "Active" }))
  if (/worker/i.test(section)) return demoUsers.filter((user) => user.role === "worker").map((user) => ({ ID: user.id, Name: user.name, Role: user.role, Location: user.neighborhood, Status: user.status === "pending" ? "Pending review" : user.status === "suspended" ? "Suspended" : "Active" }))
  if (/business/i.test(section)) return demoUsers.filter((user) => user.role === "business").map((user) => ({ ID: user.id, Name: user.name, Role: user.role, Location: user.neighborhood, Status: user.status === "pending" ? "Pending review" : user.status === "suspended" ? "Suspended" : "Active" }))
  if (/user|team|role|member/i.test(section)) return demoUsers.map((user) => ({ ID: user.id, Name: user.name, Role: user.role, Location: user.neighborhood, Status: user.status === "pending" ? "Pending review" : user.status === "suspended" ? "Suspended" : "Active" }))
  if (role === "account") return [{ ID: "BK-2041", Name: "Kitchen light repair", Worker: "Abebe Tadesse", Date: "Nov 24, 2026", Amount: formatETB(900), Status: "Confirmed" }, { ID: "BK-2038", Name: "Home deep clean", Worker: "Lemlem Hailu", Date: "Nov 19, 2026", Amount: formatETB(1800), Status: "Completed" }]
  if (role === "worker") return [{ ID: "APP-204", Name: "Experienced Electrician for new café", Employer: "Kora Coffee House", Date: "2026-11-20", Status: "In review" }, { ID: "APP-196", Name: "Residential wiring project", Employer: "Abdi Construction", Date: "2026-11-18", Status: "Shortlisted" }]
  return [{ ID: "VAC-042", Name: "Weekend home cook", Category: "Cooks", Applicants: "12", Date: "2026-11-20", Status: "Active" }, { ID: "VAC-039", Name: "Delivery rider", Category: "Transport", Applicants: "8", Date: "2026-11-18", Status: "Active" }]
}

export const formatETB = (amount: number, locale: Locale = "en") => new Intl.NumberFormat(locale === "am" ? "am-ET" : locale === "om" ? "om-ET" : "en-ET", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(amount)

export function formatDate(value: string, locale: Locale = "en") {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : locale === "om" ? "om-ET" : "en-ET", { dateStyle: "medium" }).format(date)
}

export const slugify = (value: string) => value.toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
