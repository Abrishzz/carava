import { expect, test, type Page, type Response } from "@playwright/test"
import { businessProfiles, dashboardSections, jobs, services, slugify, workers } from "../../lib/carava-data"

const staticRoutes = ["/", "/search", "/categories", "/jobs", "/about", "/help", "/contact", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/verify", "/onboarding"]
const dashboardRoutes = Object.entries(dashboardSections).flatMap(([role, sections]) => sections.map((section) => section === "Overview" ? `/${role}` : `/${role}/${slugify(section)}`))
const detailRoutes = [
  ...workers.map((worker) => `/workers/${worker.id}`),
  ...jobs.map((job) => `/jobs/${job.id}`),
  ...services.map((service) => `/services/${service.id}`),
  ...businessProfiles.map((business) => `/businesses/${business.id}`),
]
const discoveredRoutes = [...new Set([...staticRoutes, ...dashboardRoutes, ...detailRoutes])]

async function gotoReady(page: Page, path: string, expectReady = true): Promise<Response | null> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 })
      if (expectReady) await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 10_000 })
      return response
    } catch (error) {
      lastError = error
      if (expectReady && page.url() === new URL(path, "http://localhost:3000").href) {
        const ready = await page.locator("html").getAttribute("data-carava-ready", { timeout: 2_000 }).catch(() => null)
        if (ready === "true") return null
      }
    }
  }
  throw lastError
}

async function openEnglishPage(page: Page, path: string) {
  await gotoReady(page, path)
  await page.locator(".locale-picker select").first().selectOption("en")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
}

test("registration continues through demo verification and onboarding", async ({ page }) => {
  await openEnglishPage(page, "/register")
  await page.getByRole("button", { name: /Find help/ }).click()
  await page.getByLabel("Phone number").fill("+251911000001")
  await page.locator("form button[type=submit]").click()
  await expect(page).toHaveURL(/\/verify$/)
  await page.getByLabel("Demo verification code").fill("1234")
  await page.locator("form button[type=submit]").click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel("Your name").fill("Demo Customer")
  await page.locator("form button[type=submit]").click()
  await page.getByLabel("Choose a starting category").selectOption({ index: 1 })
  await page.getByLabel("Choose an Adama neighborhood").selectOption({ index: 1 })
  await page.locator("form button[type=submit]").click()
  await page.locator("form button[type=submit]").click()
  await expect(page).toHaveURL(/\/account$/)
})

test("demo login validates required fields and invalid verification codes", async ({ page }) => {
  await openEnglishPage(page, "/login")
  const login = page.locator(".auth-form")
  await login.getByRole("button", { name: "Sign in to demo" }).click()
  await expect(login.getByLabel("Phone number")).toHaveJSProperty("validity.valid", false)
  await login.getByLabel("Phone number").fill("+251911000006")
  await login.getByLabel("Password").fill("demo-password")
  await login.getByRole("button", { name: "Sign in to demo" }).click()
  await expect(page).toHaveURL("http://localhost:3000/account")
  await expect(page.locator(".dashboard-welcome h1")).toContainText("Mekdes")

  await openEnglishPage(page, "/verify")
  await page.getByLabel("Phone number").fill("+251911000006")
  await page.getByLabel("Demo verification code").fill("0000")
  await page.getByRole("button", { name: "Continue with demo code" }).click()
  await expect(page.locator(".form-error")).toContainText("Use the demo code 1234")
  await page.getByLabel("Demo verification code").fill("1234")
  await page.getByRole("button", { name: "Continue with demo code" }).click()
  await expect(page).toHaveURL("http://localhost:3000/onboarding")
})

test("customer creates a scheduled service request without a native date picker", async ({ page }) => {
  await openEnglishPage(page, "/services/svc-1")
  await page.getByRole("button", { name: /Request this service/ }).click()
  await page.locator(".booking-dialog .schedule-options button").first().click()
  await page.locator(".booking-dialog .schedule-times button").first().click()
  await page.getByLabel("What do you need done?").fill("Repair the kitchen light and check the switch.")
  await page.getByRole("button", { name: "Review demo request" }).click()
  await expect(page).toHaveURL(/\/account\/bookings$/)
  await expect(page.locator(".workflow-detail-copy")).toContainText("Repair the kitchen light and check the switch.")
  await expect(page.locator(".workflow-record").first()).toContainText(/\d{2}:\d{2}/)
})

test("customer reschedules a booking and sends a booking message", async ({ page }) => {
  await openEnglishPage(page, "/account/bookings")
  const booking = page.locator(".workflow-record").first()
  await booking.getByRole("button", { name: "Request a reschedule" }).first().click()
  await booking.locator(".booking-expanded .schedule-options button").first().click()
  await booking.locator(".booking-expanded .schedule-times button").first().click()
  await booking.locator(".booking-expanded-section").nth(1).getByRole("button", { name: "Request a reschedule" }).click()
  await expect(booking).toContainText("Reschedule requested")
  await booking.getByRole("button", { name: "Booking details" }).click()
  await booking.getByLabel("Write a demo message").fill("Can we confirm the updated appointment?")
  await booking.getByRole("button", { name: "Send message" }).click()
  await expect(booking).toContainText("Can we confirm the updated appointment?")
})

test("worker applies to a public role and sees the application status", async ({ page }) => {
  await openEnglishPage(page, "/jobs/job-3")
  await page.getByRole("button", { name: "Apply for this job" }).click()
  await openEnglishPage(page, "/worker/applications")
  await expect(page.locator(".workflow-record").first()).toContainText("Guzo Express")
  await expect(page.locator(".workflow-record").first()).toContainText("submitted")
})

test("worker accepts an invitation", async ({ page }) => {
  await openEnglishPage(page, "/worker/invitations")
  const invitation = page.locator(".workflow-record").first()
  await invitation.getByRole("button", { name: "Accept" }).click()
  await expect(invitation).toContainText("Accepted")
})

test("worker submits completion evidence, customer confirms, payout and review persist", async ({ page }) => {
  await openEnglishPage(page, "/worker/bookings")
  const booking = page.locator(".workflow-record").first()
  await booking.getByRole("button", { name: "Start work" }).click()
  await booking.getByRole("button", { name: "Booking details" }).click()
  await booking.getByLabel("Completion evidence").fill("Replaced the switch and tested the circuit.")
  await booking.getByRole("button", { name: "Submit completion" }).click()
  await expect(booking).toContainText("Completion submitted")
  await openEnglishPage(page, "/account/bookings")
  const customerBooking = page.locator(".workflow-record").first()
  await customerBooking.getByRole("button", { name: "Confirm Completed" }).click()
  await expect(customerBooking).toContainText("Completed")

  await openEnglishPage(page, "/worker/payouts")
  await page.getByRole("button", { name: "Request payout" }).click()
  await expect(page.getByRole("status")).toContainText("payout")
  await expect(page.locator(".workflow-record").filter({ hasText: "PO-DEMO-001" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Request payout" })).toBeDisabled()

  await openEnglishPage(page, "/admin/payouts")
  const payout = page.locator(".workflow-record").filter({ hasText: "PO-DEMO-001" })
  await payout.getByRole("button", { name: "Approve payout" }).click()
  const payoutDialog = page.getByRole("dialog")
  await payoutDialog.getByLabel("Required reason").fill("Sample payout review approved for the UI demo.")
  await payoutDialog.getByRole("button", { name: "Confirm demo action" }).click()
  await openEnglishPage(page, "/worker/payouts")
  await expect(page.locator(".workflow-record").filter({ hasText: "PO-DEMO-001" })).toContainText("Approved · demo only")

  await openEnglishPage(page, "/account/reviews")
  const review = page.locator(".workflow-record").filter({ hasText: "BK-2041" })
  await review.getByLabel("What went well?").fill("The completed work was checked and the updates were clear.")
  await review.getByRole("button", { name: "Submit review" }).click()
  await expect(review.locator(".review-card")).toContainText("updates were clear")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").filter({ hasText: "BK-2041" }).locator(".review-card")).toContainText("updates were clear")
})

test("business publishes a vacancy draft and can edit it", async ({ page }) => {
  await openEnglishPage(page, "/business/vacancies")
  await page.getByRole("button", { name: "Add new" }).first().click()
  await page.locator(".new-record-form input").first().fill("Weekend event host")
  await page.locator(".new-record-form input").nth(1).fill("Host neighborhood events and support guests.")
  await page.getByRole("button", { name: "Create demo record" }).click()
  await expect(page.getByText("Weekend event host")).toBeVisible()
  const vacancy = page.locator(".simple-table tbody tr").filter({ hasText: "Weekend event host" })
  await vacancy.getByRole("button", { name: "Edit" }).click()
  await page.locator(".new-record-form input").first().fill("Weekend event coordinator")
  await page.getByRole("button", { name: "Save vacancy draft" }).click()
  await expect(page.getByText("Weekend event coordinator")).toBeVisible()
})

test("business shortlists an applicant in the shared recruitment pipeline", async ({ page }) => {
  await openEnglishPage(page, "/business/applicants")
  const applicant = page.locator(".workflow-record").filter({ hasText: "Abebe Tadesse" }).first()
  await applicant.getByRole("button", { name: "Shortlist" }).click()
  await expect(applicant).toContainText("shortlisted")
})

test("admin verifies a worker with a required reason", async ({ page }) => {
  await openEnglishPage(page, "/admin/worker-verification")
  await page.getByRole("button", { name: "Approve" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Reason for this demo action").fill("Sample documents checked in the training flow.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()
  await expect(page.getByRole("status")).toContainText(/Demo audit record added: Approve/)
})

test("admin approves a moderated vacancy with an audit reason", async ({ page }) => {
  await openEnglishPage(page, "/admin/job-approval")
  await page.getByRole("button", { name: "Approve" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Reason for this demo action").fill("Sample vacancy meets the demo listing rules.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()
  await expect(page.getByRole("status")).toContainText(/Demo audit record added: Approve/)
})

test("admin investigates and resolves a dispute with a reason", async ({ page }) => {
  await openEnglishPage(page, "/admin/disputes")
  const dispute = page.locator(".workflow-record").first()
  await dispute.getByRole("button", { name: "Investigate" }).click()
  await dispute.getByLabel("Required investigation reason").fill("Compared the sample schedule and service scope.")
  await dispute.getByRole("button", { name: "Resolve demo case" }).click()
  await expect(dispute).toContainText("resolved")
})

test("admin reviews financial records with a required reason", async ({ page }) => {
  await openEnglishPage(page, "/admin/payments")
  await page.getByRole("button", { name: "Review record" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Required reason").fill("Training review completed; no funds were moved.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()
  await expect(page.getByRole("status")).toContainText(/Demo review payment saved with an audit reason/)
})

test("booking conversations stay scoped and visible across customer and worker dashboards", async ({ page }) => {
  await openEnglishPage(page, "/account/bookings")
  const customerBooking = page.locator(".workflow-record").filter({ hasText: "BK-2041" })
  await customerBooking.getByRole("button", { name: "Booking details" }).click()
  await customerBooking.getByLabel("Write a demo message").fill("The electrician conversation stays on this booking.")
  await customerBooking.getByRole("button", { name: "Send message" }).click()
  await openEnglishPage(page, "/worker/bookings")
  const workerBooking = page.locator(".workflow-record").filter({ hasText: "BK-2041" })
  await workerBooking.getByRole("button", { name: "Booking details" }).click()
  await expect(workerBooking).toContainText("The electrician conversation stays on this booking.")
  await openEnglishPage(page, "/account/bookings")
  const otherBooking = page.locator(".workflow-record").filter({ hasText: "BK-2031" })
  await otherBooking.getByRole("button", { name: "Booking details" }).click()
  await expect(otherBooking).not.toContainText("The electrician conversation stays on this booking.")
})

test("customer job posts connect moderation, worker applications, and customer review", async ({ page }) => {
  const title = "Weekend home wiring check"
  await openEnglishPage(page, "/account/my-job-posts")
  await page.getByLabel("Job title").fill(title)
  await page.getByLabel("Category").selectOption("Electricians")
  await page.getByLabel("What needs to be done?").fill("Inspect the kitchen outlets and replace one damaged switch.")
  await page.getByRole("button", { name: "Submit job post for review" }).click()
  await expect(page.locator(".workflow-record").filter({ hasText: title })).toContainText("Pending review")

  await openEnglishPage(page, "/admin/job-approval")
  const post = page.locator(".admin-record-card").filter({ hasText: title })
  await post.getByRole("button", { name: "Approve" }).click()
  const approval = page.getByRole("dialog")
  await approval.getByLabel("Reason for this demo action").fill("Customer job request is ready for worker discovery.")
  await approval.getByRole("button", { name: "Confirm demo action" }).click()

  await openEnglishPage(page, "/worker/job-discovery")
  const opportunity = page.locator(".dashboard-job-card").filter({ hasText: title })
  await opportunity.getByRole("button", { name: "Apply" }).click()
  await openEnglishPage(page, "/account/applications")
  const application = page.locator(".workflow-record").filter({ hasText: title })
  await expect(application).toContainText("submitted")
  await application.getByRole("button", { name: "Shortlist" }).click()
  await expect(application).toContainText("shortlisted")
  await openEnglishPage(page, "/worker/applications")
  await expect(page.locator(".workflow-record").filter({ hasText: title })).toContainText("shortlisted")
})

test("worker can reply to a review and keep the reply in the demo workspace", async ({ page }) => {
  await openEnglishPage(page, "/worker/reviews")
  const review = page.locator(".workflow-record").filter({ hasText: "RV-188" })
  await review.getByLabel("Reply to this review").fill("Thanks for the feedback; I will confirm arrival times earlier.")
  await review.getByRole("button", { name: "Save demo reply" }).click()
  await expect(review).toContainText("Thanks for the feedback; I will confirm arrival times earlier.")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").filter({ hasText: "RV-188" })).toContainText("Thanks for the feedback; I will confirm arrival times earlier.")
})

test("business team roles and assignments are editable in their own workspace", async ({ page }) => {
  await openEnglishPage(page, "/business/team-roles")
  const role = page.getByLabel("Mekdes Alemu Role")
  await role.selectOption("Recruiter")
  await expect(role).toHaveValue("Recruiter")
  await openEnglishPage(page, "/business/worker-assignments")
  await expect(page.locator(".workflow-panel h2")).toHaveText("Worker assignments")
  await expect(page.getByRole("combobox").nth(1)).toBeVisible()
})

test("business worker assignment appears in the worker application workspace", async ({ page }) => {
  await openEnglishPage(page, "/business/worker-assignments")
  const assignmentForm = page.locator(".workflow-panel form")
  await assignmentForm.locator("select").nth(0).selectOption("abebe-tadesse")
  await assignmentForm.locator("select").nth(1).selectOption("job-1")
  await page.getByRole("button", { name: "Assign worker" }).click()
  await expect(page.locator(".workflow-record").filter({ hasText: "Experienced Electrician for new café" })).toContainText("Active")
  await openEnglishPage(page, "/worker/applications")
  await expect(page.getByText("Business assignment")).toBeVisible()
  await expect(page.locator(".workflow-record").filter({ hasText: "Business assignment" })).toContainText("Experienced Electrician for new café")
})

test("admin can edit a category record without fake-success feedback", async ({ page }) => {
  await openEnglishPage(page, "/admin/categories")
  const category = page.locator(".admin-record-card").first()
  await category.getByRole("button", { name: "Edit" }).click()
  await page.getByLabel("Name or title").fill("Skilled trades — updated")
  await page.getByRole("button", { name: "Save demo record" }).click()
  await expect(page.locator(".admin-record-card").filter({ hasText: "Skilled trades — updated" })).toBeVisible()
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".admin-record-card").filter({ hasText: "Skilled trades — updated" })).toBeVisible()
})

test("admin role details open accessibly and platform settings persist", async ({ page }) => {
  await openEnglishPage(page, "/admin/roles-and-permissions")
  await page.locator(".admin-record-card").first().getByRole("button", { name: "View" }).click()
  const details = page.getByRole("dialog")
  await expect(details).toContainText("Permissions")
  await details.getByRole("button", { name: "Close details" }).click()
  await openEnglishPage(page, "/admin/commission-configuration")
  const commission = page.getByLabel("Commission percentage")
  await commission.fill("12")
  await page.getByRole("button", { name: "Save configuration" }).click()
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Commission percentage")).toHaveValue("12")
})

test("customer, worker, business, and admin workflow routes render", async ({ page }) => {
  const routes = ["/account/bookings", "/worker/applications", "/worker/invitations", "/business/applicants", "/business/team-members", "/business/analytics", "/admin/worker-verification", "/admin/job-approval", "/admin/payments"]
  for (const route of routes) {
    await openEnglishPage(page, route)
    await expect(page.locator("main h1").first(), `${route} should render a heading`).toBeVisible()
  }
})

test("dashboard language preference persists across workflow navigation", async ({ page }) => {
  await gotoReady(page, "/worker")
  await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 20_000 })
  await page.locator(".dashboard-tools select").selectOption("om")
  await expect(page.locator("html")).toHaveAttribute("lang", "om")
  await expect(page.getByRole("link", { name: "Cuunfaa" })).toBeVisible()
  await gotoReady(page, "/worker/bookings")
  await expect(page.locator("html")).toHaveAttribute("lang", "om")
  await expect(page.locator(".workflow-panel-heading h2")).toHaveText("Odeeffannoo qabannoo")
  await gotoReady(page, "/worker/portfolio")
  await expect(page.locator("html")).toHaveAttribute("lang", "om")
  await expect(page.locator(".section-page-card h2")).toHaveText("Hojiiwwan koo")
  await expect(page.locator(".simple-table th").nth(1)).toHaveText("Maqaa")
  await expect(page.getByRole("button", { name: "Haaraa dabali" })).toHaveCount(2)
  await expect(page.locator(".simple-table")).toContainText("Agarsiisaa maxxanfame")
})

test("major public routes render a page heading", async ({ page }) => {
  const routes = ["/", "/search", "/categories", "/jobs", "/about", "/help", "/contact", "/privacy", "/terms", "/workers/abebe-tadesse", "/services/svc-1", "/businesses/sample-business"]
  for (const route of routes) {
    await openEnglishPage(page, route)
    await expect(page.locator("main h1").first(), `${route} should render a heading`).toBeVisible()
  }
})

test("all discovered routes load directly without runtime errors", async ({ page }) => {
  test.setTimeout(180_000)
  expect(discoveredRoutes).toHaveLength(116)
  const pageErrors: string[] = []
  const inventory = { buttons: 0, links: 0, fields: 0, inputs: 0, textareas: 0, selects: 0, checkboxes: 0, radios: 0, fileInputs: 0, switches: 0, tabs: 0, menus: 0, menuItems: 0, dialogs: 0, forms: 0, searchControls: 0, dateTimeControls: 0, toggleControls: 0, menuTriggers: 0, paginationControls: 0, sortControls: 0, ariaRoleControls: 0, focusableControls: 0 }
  const unnamedControls = new Set<string>()
  const unsupportedTargets = new Set<string>()
  const placeholderTargets = new Set<string>()
  page.on("pageerror", (error) => pageErrors.push(error.message))

  for (const route of discoveredRoutes) {
    const response = await gotoReady(page, route)
    expect(response?.status() ?? 0, `${route} should not fail to load`).toBeLessThan(500)
    await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 20_000 })
    await expect(page.locator("main h1, main h2").first(), `${route} should render page content`).toBeVisible()
    const routeInventory = await page.evaluate((knownRoutes) => {
      const visible = (element: Element) => element.getClientRects().length > 0
      const textName = (element: Element) => element.getAttribute("aria-label")?.trim() || element.getAttribute("aria-labelledby") || element.textContent?.trim() || element.querySelector("img")?.getAttribute("alt")?.trim() || element.getAttribute("title")?.trim() || ""
      const roleControls = [...document.querySelectorAll('[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="combobox"], [role="option"], [role="slider"], [role="spinbutton"]')]
      const actionable = [...new Set([...document.querySelectorAll("button, a[href]"), ...roleControls])]
      const unnamed = actionable.filter((element) => visible(element) && !textName(element)).map((element) => `${element.tagName.toLowerCase()} ${element.outerHTML.slice(0, 120)}`)
      const unlabeledFields = [...document.querySelectorAll("input, select, textarea")].filter((element) => visible(element) && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby") && !("labels" in element && (element as HTMLInputElement).labels?.length)).map((element) => `${element.tagName.toLowerCase()} ${element.outerHTML.slice(0, 120)}`)
      const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(visible)
      const unknownTargets = anchors.filter((anchor) => anchor.getAttribute("href")?.startsWith("/")).map((anchor) => new URL(anchor.href, location.origin).pathname).filter((pathname) => !knownRoutes.includes(pathname))
      const placeholderTargets = anchors.filter((anchor) => anchor.getAttribute("href") === "#" || /^javascript:/i.test(anchor.getAttribute("href") ?? "")).map((anchor) => `${anchor.tagName.toLowerCase()} ${anchor.getAttribute("href")}`)
      return {
        buttons: [...document.querySelectorAll("button")].filter(visible).length,
        links: [...document.querySelectorAll("a[href]")].filter(visible).length,
        fields: [...document.querySelectorAll("input, select, textarea")].filter(visible).length,
        inputs: [...document.querySelectorAll("input")].filter(visible).length,
        textareas: [...document.querySelectorAll("textarea")].filter(visible).length,
        selects: [...document.querySelectorAll("select")].filter(visible).length,
        checkboxes: [...document.querySelectorAll('input[type="checkbox"]')].filter(visible).length,
        radios: [...document.querySelectorAll('input[type="radio"]')].filter(visible).length,
        fileInputs: [...document.querySelectorAll('input[type="file"]')].filter(visible).length,
        switches: [...document.querySelectorAll('[role="switch"]')].filter(visible).length,
        tabs: [...document.querySelectorAll('[role="tab"]')].filter(visible).length,
        menus: [...document.querySelectorAll('[role="menu"]')].filter(visible).length,
        menuItems: [...document.querySelectorAll('[role="menuitem"]')].filter(visible).length,
        dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(visible).length,
        forms: [...document.querySelectorAll("form")].filter(visible).length,
        searchControls: [...document.querySelectorAll('input[type="search"], [role="searchbox"]')].filter(visible).length,
        dateTimeControls: [...document.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]')].filter(visible).length,
        toggleControls: [...document.querySelectorAll('[aria-pressed]')].filter(visible).length,
        menuTriggers: [...document.querySelectorAll('[aria-haspopup]')].filter(visible).length,
        paginationControls: [...document.querySelectorAll('[aria-label*="page" i], [data-pagination]')].filter(visible).length,
        sortControls: [...document.querySelectorAll('[aria-sort], [data-sort]')].filter(visible).length,
        ariaRoleControls: roleControls.filter(visible).length,
        focusableControls: [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(visible).length,
        unnamed,
        unlabeledFields,
        unknownTargets,
        placeholderTargets,
      }
    }, discoveredRoutes)
    for (const key of Object.keys(inventory) as Array<keyof typeof inventory>) inventory[key] += routeInventory[key]
    routeInventory.unnamed.forEach((item) => unnamedControls.add(`${route}: ${item}`))
    routeInventory.unlabeledFields.forEach((item) => unnamedControls.add(`${route}: ${item}`))
    routeInventory.unknownTargets.forEach((item) => unsupportedTargets.add(`${route} → ${item}`))
    routeInventory.placeholderTargets.forEach((item) => placeholderTargets.add(`${route}: ${item}`))
  }

  expect(pageErrors).toEqual([])
  expect([...unnamedControls]).toEqual([])
  expect([...unsupportedTargets]).toEqual([])
  expect([...placeholderTargets]).toEqual([])
  console.log(`CARAVA_ROUTE_AUDIT ${JSON.stringify({ routes: discoveredRoutes.length, visibleElementInstances: inventory, unnamedControls: unnamedControls.size, unsupportedTargets: unsupportedTargets.size, placeholderTargets: placeholderTargets.size })}`)
})

test("unknown paths and unknown entity IDs return the branded 404", async ({ page }) => {
  test.setTimeout(180_000)
  for (const route of ["/this-route-is-not-real", "/workers/not-a-real-worker", "/jobs/not-a-real-job", "/services/no-such-service", "/businesses/not-a-real-company", "/admin/not-a-section"]) {
    const response = await gotoReady(page, route, false)
    expect(response?.status(), `${route} should return 404`).toBe(404)
    await expect(page.getByRole("heading", { name: "ይህን ገጽ ማግኘት አልቻልንም" })).toBeVisible()
  }

  await gotoReady(page, "/search")
  await gotoReady(page, "/categories")
  await page.goBack()
  await expect(page).toHaveURL("http://localhost:3000/search")
  await page.goForward()
  await expect(page).toHaveURL("http://localhost:3000/categories")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("main h1").first()).toBeVisible()
})

test("home and dashboard navigation fit every requested viewport", async ({ page }) => {
  test.setTimeout(180_000)
  const viewports = [[300, 600], [320, 640], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]
  await gotoReady(page, "/")
  await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 20_000 })

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme })
    await expect(page.locator("html")).toHaveCSS("color-scheme", colorScheme)
    const bodyBackground = await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(bodyBackground, `${colorScheme} color scheme should apply its page surface`).toBe(colorScheme === "dark" ? "rgb(16, 24, 21)" : "rgb(247, 249, 247)")
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height })
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
      expect(dimensions.content, `${colorScheme} home at ${width}x${height} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.viewport)
    }
  }

  await page.setViewportSize({ width: 300, height: 600 })
  await page.getByRole("button", { name: "ዳሰሳን ክፈት" }).click()
  await expect(page.locator(".main-nav")).toBeVisible()
  await page.getByRole("button", { name: "ዳሰሳን ዝጋ" }).click()
  await gotoReady(page, "/worker")
  await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 20_000 })
  await page.locator(".section-mobile-menu").click()
  await expect(page.locator(".section-mobile-menu")).toHaveAttribute("aria-expanded", "true")
  await page.locator(".dashboard-close-menu").click()
  await expect(page.locator(".section-mobile-menu")).toHaveAttribute("aria-expanded", "false")
})

test("worker search filters and saved profiles update the customer workspace", async ({ page }) => {
  await openEnglishPage(page, "/search")
  await page.getByLabel("Choose a category").selectOption("Electricians")
  await expect(page.locator(".worker-card")).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Abebe Tadesse" })).toBeVisible()
  await page.getByRole("button", { name: "Save Abebe Tadesse" }).click()
  await expect(page.getByRole("status")).toContainText("Saved to your professional list")
  await openEnglishPage(page, "/account/saved-workers")
  await expect(page.locator(".worker-card")).toContainText("Abebe Tadesse")
  await page.getByRole("button", { name: "Unsave Abebe Tadesse" }).click()
  await expect(page.getByText("No saved professionals yet")).toBeVisible()
})

test("contact form rejects missing fields and confirms the demo-only submission", async ({ page }) => {
  await openEnglishPage(page, "/contact")
  const form = page.locator(".contact-form")
  await form.getByRole("button", { name: "Send demo message" }).click()
  await expect(form.getByLabel("Your name")).toHaveJSProperty("validity.valid", false)
  await expect(page.getByText("Your demo message is ready")).toHaveCount(0)
  await form.getByLabel("Your name").fill("Audit Tester")
  await form.getByLabel("Email address").fill("audit@example.test")
  await form.getByLabel("What would you like to share?").fill("Checking the frontend demo contact form.")
  await form.getByRole("button", { name: "Send demo message" }).click()
  await expect(page.getByText(/has not been sent to a live support team/)).toBeVisible()
})

test("notification read actions update the visible state and persist", async ({ page }) => {
  await openEnglishPage(page, "/account/notifications")
  await expect(page.locator(".notification-row.unread")).toHaveCount(1)
  await page.getByRole("button", { name: "Mark read" }).click()
  await expect(page.locator(".notification-row.unread")).toHaveCount(0)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".notification-row.unread")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Read" }).first()).toBeDisabled()
})

test("mark all notifications read changes each row and persists", async ({ page }) => {
  await openEnglishPage(page, "/account/notifications")
  await expect(page.locator(".notification-row.unread")).toHaveCount(1)
  await page.getByRole("button", { name: "Mark all read" }).click()
  await expect(page.locator(".notification-row.unread")).toHaveCount(0)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".notification-row.unread")).toHaveCount(0)
})

test("malformed demo storage falls back to safe initial records", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("carava-demo-bookings", "[null]"))
  await openEnglishPage(page, "/account/bookings")
  await expect(page.locator(".workflow-record")).toHaveCount(3)
  await expect(page.locator("main")).toContainText("Kitchen light repair")
})

test("invitation actions remain usable when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const blockedKey = "carava-demo-invitations"
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.getItem = function (key) {
      if (key === blockedKey) throw new DOMException("Storage access denied", "SecurityError")
      return originalGetItem.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key === blockedKey) throw new DOMException("Storage access denied", "QuotaExceededError")
      return originalSetItem.call(this, key, value)
    }
  })
  await openEnglishPage(page, "/worker/invitations")
  const invitation = page.locator(".workflow-record").first()
  await invitation.getByRole("button", { name: "Accept" }).click()
  await expect(invitation).toContainText("Accepted")
})

test("vacancy moderation, job discovery, application, and shortlisting stay connected", async ({ page }) => {
  const title = `Acceptance audit vacancy ${Date.now()}`
  await openEnglishPage(page, "/business/vacancies")
  await page.getByRole("button", { name: "Add new" }).first().click()
  await page.locator(".new-record-form input").first().fill(title)
  await page.locator(".new-record-form input").nth(1).fill("A verified end-to-end demo vacancy.")
  await page.getByRole("button", { name: "Create demo record" }).click()
  await expect(page.getByText(title)).toBeVisible()

  await openEnglishPage(page, "/admin/job-approval")
  const pendingRecord = page.locator(".admin-record-card").filter({ hasText: title })
  await pendingRecord.getByRole("button", { name: "Approve" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Reason for this demo action").fill("Acceptance workflow moderation check.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()

  await openEnglishPage(page, "/jobs")
  const jobCard = page.locator(".job-card").filter({ hasText: title })
  await expect(jobCard).toBeVisible()
  const jobHref = await jobCard.getByRole("link").first().getAttribute("href")
  expect(jobHref).toBeTruthy()
  await gotoReady(page, jobHref!)
  await expect(page.locator("main h1")).toHaveText(title)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("main h1")).toHaveText(title)
  await page.getByRole("button", { name: "Apply for this job" }).click()

  await openEnglishPage(page, "/business/applicants")
  const applicant = page.locator(".workflow-record").filter({ hasText: title })
  await applicant.getByRole("button", { name: "Shortlist" }).click()
  await openEnglishPage(page, "/business/interviews")
  const interviewCandidate = page.locator(".workflow-record").filter({ hasText: title })
  const applicationId = (await interviewCandidate.locator(".eyebrow").innerText()).split(" · ")[0]
  await interviewCandidate.getByLabel(`Interview day for ${applicationId}`).selectOption({ index: 1 })
  await interviewCandidate.getByLabel(`Interview time for ${applicationId}`).selectOption("11:00")
  await interviewCandidate.getByRole("button", { name: "Schedule interview" }).click()
  await expect(interviewCandidate).toContainText("Interview scheduled")
  await openEnglishPage(page, "/worker/applications")
  await expect(page.locator(".workflow-record").filter({ hasText: title })).toContainText("interview")
})

test("customer complaint is resolved in admin and reflects back to customer", async ({ page }) => {
  const subject = `Acceptance audit complaint ${Date.now()}`
  await openEnglishPage(page, "/account/complaints-and-disputes")
  const complaintForm = page.locator(".workflow-form")
  await complaintForm.getByLabel("Related booking").selectOption("BK-2041")
  await complaintForm.getByLabel("Complaint topic").fill(subject)
  await complaintForm.getByLabel("What happened?").fill("The sample appointment details need a review.")
  await complaintForm.getByRole("button", { name: "Submit demo complaint" }).click()
  await expect(page.locator(".workflow-record").filter({ hasText: subject })).toBeVisible()

  await openEnglishPage(page, "/admin/disputes")
  const dispute = page.locator(".workflow-record").filter({ hasText: subject })
  await dispute.getByRole("button", { name: "Investigate" }).click()
  await dispute.getByLabel("Required investigation reason").fill("Compared the request details and appointment schedule.")
  await dispute.getByRole("button", { name: "Resolve demo case" }).click()
  await expect(dispute).toContainText("resolved")

  await openEnglishPage(page, "/account/complaints-and-disputes")
  const resolved = page.locator(".workflow-record").filter({ hasText: subject })
  await expect(resolved).toContainText("resolved")
  await expect(resolved).toContainText("Compared the request details")
})

test("business profile routes show the matching company and opportunities", async ({ page }) => {
  await openEnglishPage(page, "/businesses/guzo-express")
  await expect(page.locator("main h1")).toHaveText("Guzo Express")
  await expect(page.locator("main")).toContainText("local delivery team")
  await expect(page.locator(".business-job-row").first()).toContainText("Delivery rider")
})

test("admin record search and status filters update visible records", async ({ page }) => {
  await openEnglishPage(page, "/admin/users")
  await expect(page.locator(".admin-record-card")).toHaveCount(5)
  await page.getByLabel("Search Users").fill("Hanna Girma")
  await expect(page.locator(".admin-record-card")).toHaveCount(1)
  await expect(page.locator(".admin-record-card").first()).toContainText("Hanna Girma")
  await page.getByLabel("Filter by status").selectOption({ label: "Pending review" })
  await expect(page.locator(".admin-record-card")).toHaveCount(1)
  await page.getByLabel("Search Users").fill("No matching demo user")
  await expect(page.getByText("No matching records")).toBeVisible()
})

test("receipt and admin CSV exports download as demo files", async ({ page }) => {
  await openEnglishPage(page, "/account/receipts")
  const receiptDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download demo receipt" }).first().click()
  expect((await receiptDownload).suggestedFilename()).toBe("receipt-BK-2041.txt")

  await openEnglishPage(page, "/admin/analytics-and-reports")
  const reportDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export CSV" }).click()
  expect((await reportDownload).suggestedFilename().endsWith(".csv")).toBe(true)
})

test("worker profile edits and availability persist in the browser demo", async ({ page }) => {
  await openEnglishPage(page, "/worker/my-profile")
  await page.getByLabel("Service headline").fill("Audit electrician profile")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByRole("status")).toContainText("saved in this browser demo")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Service headline")).toHaveValue("Audit electrician profile")

  await openEnglishPage(page, "/worker/availability-calendar")
  const saturday = page.locator(".availability-day").filter({ hasText: "Sat" })
  await expect(saturday).toHaveAttribute("aria-pressed", "false")
  await saturday.click()
  await page.getByRole("button", { name: "Save availability" }).click()
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".availability-day").filter({ hasText: "Sat" })).toHaveAttribute("aria-pressed", "true")
})

test("business can add and retain a demo team member", async ({ page }) => {
  await openEnglishPage(page, "/business/team-members")
  const form = page.locator(".workflow-form")
  await form.getByLabel("Team member name").fill("Audit Team Member")
  await form.locator("select").first().selectOption("Coordinator")
  await form.locator("input").nth(1).fill("Reviewing demo applications")
  await form.getByRole("button", { name: "Add demo team member" }).click()
  await expect(page.locator(".workflow-record").first()).toContainText("Audit Team Member")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").first()).toContainText("Audit Team Member")
})

test("worker portfolio, certificates, and verification routes show role-specific records", async ({ page }) => {
  await openEnglishPage(page, "/worker/portfolio")
  await expect(page.locator(".simple-table")).toContainText("Café lighting installation")
  await expect(page.locator(".simple-table")).not.toContainText("Guzo Express")

  await openEnglishPage(page, "/worker/certificates")
  await expect(page.locator(".simple-table")).toContainText("Electrical safety training")

  await openEnglishPage(page, "/worker/verification")
  await expect(page.locator(".simple-table")).toContainText("Abebe Tadesse")
  await expect(page.locator(".simple-table")).toContainText("Verified (illustrative)")
})

test("customer job posts use their own workflow instead of booking rows", async ({ page }) => {
  await openEnglishPage(page, "/account/my-job-posts")
  await expect(page.getByRole("heading", { name: "My job posts" }).last()).toBeVisible()
  await expect(page.getByLabel("Job title")).toBeVisible()
  await expect(page.getByRole("button", { name: "Add new" })).toHaveCount(0)
  await expect(page.getByText("No job posts yet")).toBeVisible()
  await expect(page.getByText("Kitchen light repair")).toHaveCount(0)
})

test("worker verification request is visible to admin and returns to the worker profile", async ({ page }) => {
  await openEnglishPage(page, "/worker/verification")
  await page.getByRole("button", { name: "Request verification review" }).click()
  await expect(page.getByRole("status")).toContainText("verification request is pending")

  await openEnglishPage(page, "/admin/worker-verification")
  const workerRecord = page.locator(".admin-record-card").filter({ hasText: "Abebe Tadesse" })
  await expect(workerRecord).toContainText("Pending review")
  await workerRecord.getByRole("button", { name: "Approve" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByLabel("Reason for this demo action")).toBeFocused()
  await expect(dialog.getByRole("button", { name: "Confirm demo action" })).toBeDisabled()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(workerRecord.getByRole("button", { name: "Approve" })).toBeFocused()
  await workerRecord.getByRole("button", { name: "Approve" }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Reason for this demo action").fill("Sample demo verification was reviewed.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()
  await expect(page.getByRole("status")).toContainText("Demo audit record added: Approve")
  await expect(workerRecord).toContainText("Verified (illustrative)")

  await openEnglishPage(page, "/worker/verification")
  await expect(page.locator("main")).toContainText("Verified (illustrative)")
})

test("business verification requests and admin decisions share one status", async ({ page }) => {
  await openEnglishPage(page, "/business/company-profile")
  const companyForm = page.locator(".workflow-panel form")
  await companyForm.getByLabel("Company name").fill("")
  await companyForm.getByRole("button", { name: "Save company profile" }).click()
  await expect(companyForm.getByLabel("Company name")).toHaveJSProperty("validity.valid", false)
  await companyForm.getByLabel("Company name").fill("Kora Coffee House Demo")
  await companyForm.getByRole("button", { name: "Save company profile" }).click()
  await expect(page.getByRole("status")).toContainText("Company profile saved")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Company name")).toHaveValue("Kora Coffee House Demo")
  await gotoReady(page, "/businesses/sample-business")
  await expect(page.locator("main h1")).toHaveText("Kora Coffee House Demo")
  await expect(page.locator(".business-job-row").first()).toContainText("Experienced Electrician")

  await openEnglishPage(page, "/business/company-verification")
  await page.getByRole("button", { name: "Request verification review" }).click()
  await expect(page.getByRole("status")).toContainText("verification request is pending")
  await openEnglishPage(page, "/admin/business-verification")
  const businessRecord = page.locator(".admin-record-card").filter({ hasText: "Kora Coffee House" })
  await expect(businessRecord).toContainText("Pending review")
  await businessRecord.getByRole("button", { name: "Approve" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Reason for this demo action").fill("Sample business profile reviewed.")
  await dialog.getByRole("button", { name: "Confirm demo action" }).click()
  await openEnglishPage(page, "/business/company-verification")
  await expect(page.locator("main")).toContainText("Verified (illustrative)")
})

test("customer profile fields validate and persist after refresh", async ({ page }) => {
  await openEnglishPage(page, "/account/my-profile")
  const profile = page.locator(".profile-editor form")
  await profile.getByLabel("Display name").fill("")
  await profile.getByRole("button", { name: "Save profile" }).click()
  await expect(profile.getByLabel("Display name")).toHaveJSProperty("validity.valid", false)
  await profile.getByLabel("Display name").fill("Demo Customer Profile")
  await profile.getByLabel("Headline").fill("Adama neighbor and customer")
  await profile.getByLabel("About").fill("I am updating my local Carava profile for the customer workflow demo.")
  await profile.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByRole("status")).toContainText("Demo profile updated")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(profile.getByLabel("Display name")).toHaveValue("Demo Customer Profile")
  await expect(profile.getByLabel("Headline")).toHaveValue("Adama neighbor and customer")
})

test("worker profile form blocks invalid pricing and saves valid skills", async ({ page }) => {
  await openEnglishPage(page, "/worker/services-and-pricing")
  const form = page.locator(".workflow-panel form")
  const rate = form.getByLabel("Hourly price (ETB)")
  await rate.fill("-1")
  await form.getByRole("button", { name: "Save profile and services" }).click()
  await expect(rate).toHaveJSProperty("validity.valid", false)
  await rate.fill("625")
  await form.getByLabel("Skills (comma separated)").fill("Electrical repair, safety inspection")
  await form.getByRole("button", { name: "Save profile and services" }).click()
  await expect(page.getByRole("status")).toContainText("Worker profile and service pricing saved")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Hourly price (ETB)")).toHaveValue("625")
  await expect(page.getByLabel("Skills (comma separated)")).toHaveValue("Electrical repair, safety inspection")
})

test("admin booking cancellation requires a reason and writes an audit record", async ({ page }) => {
  await openEnglishPage(page, "/admin/bookings")
  const booking = page.locator(".workflow-record").first()
  await booking.getByRole("button", { name: "Cancel booking" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled()
  await dialog.getByLabel("Required audit reason").fill("Sample booking cancellation reviewed by operations.")
  await dialog.getByRole("button", { name: "Confirm" }).click()
  await expect(booking).toContainText("Cancelled")
  await openEnglishPage(page, "/admin/audit-logs")
  await expect(page.locator("main")).toContainText("Cancel booking BK-2041")
})

test("worker portfolio accepts safe demo files and stores only filename metadata", async ({ page }) => {
  await openEnglishPage(page, "/worker/portfolio")
  await page.getByRole("button", { name: "Add new" }).first().click()
  const form = page.locator(".new-record-form")
  await form.getByLabel("Name or title").fill("Solar inspection project")
  await form.getByLabel("Details").fill("Sample portfolio attachment.")
  const file = form.getByLabel("Upload demo file (PDF, JPG, or PNG; up to 10 MB)")
  await file.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("invalid file type") })
  await expect(form.locator(".form-error")).toContainText("Choose a PDF, JPG, or PNG file")
  await file.setInputFiles({ name: "inspection.pdf", mimeType: "application/pdf", buffer: Buffer.from("demo file metadata test") })
  await form.getByRole("button", { name: "Create demo record" }).click()
  await expect(page.locator(".simple-table")).toContainText("inspection.pdf")
  await expect(page.locator(".simple-table")).toContainText("Filename saved only; no file uploaded")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".simple-table")).toContainText("inspection.pdf")
})

test("worker certificate records can capture a demo document filename", async ({ page }) => {
  await openEnglishPage(page, "/worker/certificates")
  await page.getByRole("button", { name: "Add new" }).first().click()
  const form = page.locator(".new-record-form")
  await form.getByLabel("Name or title").fill("Electrical safety update")
  await form.getByLabel("Upload demo file (PDF, JPG, or PNG; up to 10 MB)").setInputFiles({ name: "safety-certificate.png", mimeType: "image/png", buffer: Buffer.from("demo certificate filename") })
  await form.getByRole("button", { name: "Create demo record" }).click()
  await expect(page.locator(".simple-table")).toContainText("safety-certificate.png")
  await expect(page.locator(".simple-table")).toContainText("Filename saved only; no file uploaded")
})

test("business team creation rejects duplicate member names", async ({ page }) => {
  await openEnglishPage(page, "/business/team-members")
  const form = page.locator(".workflow-form").first()
  const memberName = "Duplicate Team Test"
  await form.getByLabel("Team member name").fill(memberName)
  await form.getByRole("button", { name: "Add demo team member" }).click()
  await expect(page.locator(".workflow-record").filter({ hasText: memberName })).toHaveCount(1)
  await form.getByLabel("Team member name").fill(memberName.toLowerCase())
  await form.getByRole("button", { name: "Add demo team member" }).click()
  await expect(page.getByRole("status")).toContainText("already listed")
  await expect(page.locator(".workflow-record").filter({ hasText: memberName })).toHaveCount(1)
})

test("admin support decisions require a reason and write an audit record", async ({ page }) => {
  await openEnglishPage(page, "/admin/messages-and-support")
  const supportCase = page.locator(".workflow-record").filter({ hasText: "SUP-204" })
  await expect(supportCase).toContainText("Booking schedule question")
  await supportCase.getByRole("button", { name: "Mark in review" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled()
  await dialog.getByLabel("Required audit reason").fill("Checked the appointment notes in the sample queue.")
  await dialog.getByRole("button", { name: "Confirm" }).click()
  await expect(supportCase).toContainText("In review")
  await openEnglishPage(page, "/admin/audit-logs")
  await expect(page.locator("main")).toContainText("Review support case SUP-204")
  await expect(page.locator("main")).toContainText("Checked the appointment notes")
})

test("landing and onboarding copy updates when the language changes", async ({ page }) => {
  await gotoReady(page, "/")
  await expect(page.locator("html")).toHaveAttribute("data-carava-ready", "true", { timeout: 20_000 })
  await expect(page.locator("main h1").first()).toContainText("ጥሩ ስራ")
  await page.locator(".locale-picker select").first().selectOption("om")
  await expect(page.locator("html")).toHaveAttribute("lang", "om")
  await expect(page.locator("main h1").first()).toContainText("Hojii gaariin")
  await expect(page.getByText("Nu qunnamaa")).toBeVisible()
  await gotoReady(page, "/register")
  await expect(page.locator("main h1")).toContainText("Tarkaanfiin itti aanu")
  await expect(page.getByText("Lakkoofsa bilbilaa")).toBeVisible()
})

test("search advanced filters sync to the URL and chip controls clear them", async ({ page }) => {
  await openEnglishPage(page, "/search")
  await page.locator(".search-results-search input").fill("electric")
  await page.locator(".search-results-search button[type=submit]").click()
  await expect(page).toHaveURL(/q=electric/)
  await page.getByLabel("Choose a category").selectOption("Electricians")
  await page.getByLabel("Choose a neighborhood").selectOption("Bole")
  await page.getByLabel("Distance radius").selectOption("5")
  await page.getByLabel("Maximum hourly rate in ETB").selectOption("500")
  await page.getByLabel("Minimum years of experience").selectOption("5")
  await page.getByLabel("Language spoken").selectOption("Amharic")
  await page.getByLabel("Minimum rating").selectOption("4")
  await page.getByLabel("Verified profile").check()
  await page.getByLabel("Available now").check()
  await expect.poll(() => {
    const params = new URL(page.url()).searchParams
    return params.get("q") === "electric" && params.get("category") === "Electricians" && params.get("location") === "Bole" && params.get("radius") === "5" && params.get("price") === "500" && params.get("experience") === "5" && params.get("language") === "Amharic" && params.get("rating") === "4" && params.get("verified") === "1" && params.get("available") === "1"
  }).toBe(true)
  const chips = page.locator(".active-filter-row .active-filter")
  await expect(chips.filter({ hasText: "Within 5 km" })).toBeVisible()
  await expect(chips.filter({ hasText: "Up to ETB 500" })).toBeVisible()
  await expect(chips.filter({ hasText: "5+ years" })).toBeVisible()
  await expect(chips.filter({ hasText: "4+ stars" })).toBeVisible()
  await expect(page.locator(".worker-card")).toContainText("Abebe Tadesse")
  await chips.filter({ hasText: "Verified" }).click()
  await expect.poll(() => !new URL(page.url()).searchParams.has("verified")).toBe(true)
  await expect(chips.filter({ hasText: "Verified" })).toHaveCount(0)
  await page.locator(".active-filter-row").getByRole("button", { name: "Clear all" }).click()
  await expect(page).toHaveURL("http://localhost:3000/search")
  await expect(page.locator(".active-filter")).toHaveCount(0)
  await expect(page.locator(".worker-card")).toHaveCount(4)
})

test("search sorting, list view, and pagination update the demo results", async ({ page }) => {
  await openEnglishPage(page, "/search")
  await expect(page.locator(".worker-card")).toHaveCount(4)
  await page.getByLabel("Sort results").selectOption("price-low")
  await expect(page).toHaveURL(/sort=price-low/)
  await expect(page.locator(".worker-card").first()).toContainText("Lemlem Hailu")
  await page.getByRole("button", { name: "List view" }).click()
  await expect(page).toHaveURL(/view=list/)
  await expect(page.locator(".search-worker-results")).toHaveClass(/worker-list-view/)
  await page.getByRole("button", { name: "Grid view" }).click()
  await expect.poll(() => !new URL(page.url()).searchParams.has("view")).toBe(true)
  await expect(page.locator(".pagination span")).toContainText("Page 1 of 2")
  await page.locator(".pagination").getByRole("button", { name: "Next" }).click()
  await expect(page.locator(".pagination span")).toContainText("Page 2 of 2")
  await expect(page.locator(".worker-card")).toHaveCount(2)
})

test("public worker message appears in the worker demo inbox", async ({ page }) => {
  const body = `Profile inquiry ${Date.now()}`
  await openEnglishPage(page, "/workers/abebe-tadesse")
  await page.getByRole("button", { name: "Message this professional" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Your message").fill(body)
  await dialog.getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("status")).toContainText("Demo message saved in this browser.")
  await openEnglishPage(page, "/worker/messages")
  const received = page.locator(".message-bubble").filter({ hasText: body })
  await expect(received).toBeVisible()
  await expect(received).toContainText("Abebe Tadesse profile inquiry")
})

test("public profile report is visible in the admin notification queue", async ({ page }) => {
  const reason = `Inaccurate profile detail ${Date.now()}`
  await openEnglishPage(page, "/workers/abebe-tadesse")
  await page.getByRole("button", { name: "Report this profile" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toContainText("Report · Abebe Tadesse")
  await dialog.getByLabel("Reason").fill(reason)
  await dialog.getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("status")).toContainText("Demo report saved in this browser.")
  await openEnglishPage(page, "/admin/notifications")
  const notice = page.locator(".notification-row").filter({ hasText: "Demo report received for Abebe Tadesse" })
  await expect(notice).toBeVisible()
  await expect(notice).toContainText(reason)
})

test("public contact submission appears in the admin support queue", async ({ page }) => {
  const name = `Support Visitor ${Date.now()}`
  const body = `Please review the demo contact queue ${Date.now()}`
  await openEnglishPage(page, "/contact")
  const form = page.locator(".contact-form")
  await form.getByLabel("Your name").fill(name)
  await form.getByLabel("Email address").fill("visitor@example.test")
  await form.getByLabel("What would you like to share?").fill(body)
  await form.getByRole("button", { name: "Send demo message" }).click()
  await expect(page.getByText(/has not been sent to a live support team/)).toBeVisible()
  await openEnglishPage(page, "/admin/messages-and-support")
  const supportCase = page.locator(".workflow-record").filter({ hasText: `Contact message from ${name}` })
  await expect(supportCase).toContainText("visitor@example.test")
  await supportCase.getByRole("button", { name: "View case details" }).click()
  await expect(supportCase.locator(".workflow-detail-copy")).toContainText(body)
})

test("worker accepts and declines newly requested bookings in the shared demo record", async ({ page }) => {
  const acceptedDetails = `Accept request ${Date.now()}`
  await openEnglishPage(page, "/workers/abebe-tadesse")
  await page.getByRole("button", { name: "Request a service" }).click()
  await page.locator(".booking-dialog .schedule-options button").first().click()
  await page.locator(".booking-dialog .schedule-times button").first().click()
  await page.getByLabel("What do you need done?").fill(acceptedDetails)
  await page.getByRole("button", { name: "Review demo request" }).click()
  await expect(page).toHaveURL(/\/account\/bookings$/)
  await openEnglishPage(page, "/worker/bookings")
  const accepted = page.locator(".workflow-record").filter({ hasText: acceptedDetails })
  await accepted.getByRole("button", { name: "Accept" }).click()
  await expect(accepted).toContainText("Confirmed")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").filter({ hasText: acceptedDetails })).toContainText("Confirmed")

  const declinedDetails = `Decline request ${Date.now()}`
  await openEnglishPage(page, "/services/svc-1")
  await page.getByRole("button", { name: /Request this service/ }).click()
  await page.locator(".booking-dialog .schedule-options button").first().click()
  await page.locator(".booking-dialog .schedule-times button").first().click()
  await page.getByLabel("What do you need done?").fill(declinedDetails)
  await page.getByRole("button", { name: "Review demo request" }).click()
  await expect(page).toHaveURL(/\/account\/bookings$/)
  await openEnglishPage(page, "/worker/bookings")
  const declined = page.locator(".workflow-record").filter({ hasText: declinedDetails })
  await declined.getByRole("button", { name: "Decline" }).click()
  await expect(declined).toContainText("Cancelled")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").filter({ hasText: declinedDetails })).toContainText("Cancelled")
})

test("customer cancels a requested booking with an optional reason", async ({ page }) => {
  await openEnglishPage(page, "/account/bookings")
  const booking = page.locator(".workflow-record").filter({ hasText: "BK-2031" })
  await expect(booking).toContainText("Requested")
  await booking.getByRole("button", { name: "Cancel" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Reason (optional)").fill("Customer schedule conflict in the demo.")
  await dialog.getByRole("button", { name: "Confirm" }).click()
  await expect(booking).toContainText("Cancelled")
  await expect(booking).toContainText("Customer schedule conflict in the demo.")
  await page.reload({ waitUntil: "domcontentloaded" })
  const reloaded = page.locator(".workflow-record").filter({ hasText: "BK-2031" })
  await expect(reloaded).toContainText("Cancelled")
  await expect(reloaded).toContainText("Customer schedule conflict in the demo.")
})

test("forgot-password validates the phone number and shows demo recovery steps", async ({ page }) => {
  await openEnglishPage(page, "/forgot-password")
  const form = page.locator(".auth-form")
  await form.getByRole("button", { name: "Show recovery steps" }).click()
  await expect(form.getByLabel("Phone number")).toHaveJSProperty("validity.valid", false)
  await form.getByLabel("Phone number").fill("+251911000009")
  await form.getByRole("button", { name: "Show recovery steps" }).click()
  await expect(page.getByRole("heading", { name: "Demo recovery started" })).toBeVisible()
  await expect(page.getByText(/No text message has been sent/)).toBeVisible()
  await page.getByRole("link", { name: "Return to sign in" }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test("register role choice reaches the worker workspace and sign out restores guest controls", async ({ page }) => {
  await openEnglishPage(page, "/register")
  const roles = page.locator(".choice-grid")
  await roles.getByRole("button", { name: /Find work/ }).click()
  await expect(roles.locator(".choice-card").nth(1)).toHaveAttribute("aria-pressed", "true")
  await page.getByLabel("Phone number").fill("+251911000123")
  await page.locator(".auth-form button[type=submit]").click()
  await expect(page).toHaveURL(/\/verify$/)
  await page.getByLabel("Demo verification code").fill("1234")
  await page.locator("form button[type=submit]").click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByLabel("Account type")).toHaveValue("worker")
  await page.getByLabel("Your name").fill("Demo Worker")
  await page.locator("form button[type=submit]").click()
  await page.getByLabel("Choose a starting category").selectOption({ index: 1 })
  await page.getByLabel("Choose an Adama neighborhood").selectOption({ index: 1 })
  await page.locator("form button[type=submit]").click()
  await page.locator("form button[type=submit]").click()
  await expect(page).toHaveURL(/\/worker$/)
  await expect(page.getByRole("link", { name: "Workspace" })).toBeVisible()
  await page.getByRole("link", { name: "Back to marketplace" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("link", { name: "Workspace" })).toBeVisible()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page.getByRole("status")).toContainText("Demo signed out")
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0)
})

test("business shortlists and hires a candidate with the stage persisted", async ({ page }) => {
  await openEnglishPage(page, "/business/recruitment-pipeline")
  const candidate = page.locator(".workflow-record").filter({ hasText: "Abebe Tadesse" })
  await candidate.getByRole("button", { name: "Shortlist" }).click()
  await expect(candidate).toContainText("shortlisted")
  await candidate.getByRole("button", { name: "Hire candidate" }).click()
  await expect(candidate).toContainText("selected")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".workflow-record").filter({ hasText: "Abebe Tadesse" })).toContainText("selected")
  await openEnglishPage(page, "/worker/applications")
  await expect(page.locator(".workflow-record").filter({ hasText: "Experienced Electrician for new café" })).toContainText("selected")
})

test("admin adds a demo service record and filters or empties the queue", async ({ page }) => {
  const serviceName = `Demo service ${Date.now()}`
  await openEnglishPage(page, "/admin/services")
  await page.getByRole("button", { name: "Add new" }).first().click()
  const form = page.locator(".new-record-form")
  await form.getByLabel("Name or title").fill(serviceName)
  await form.getByLabel("Details").fill("Added through the admin demo record tool.")
  await form.getByRole("button", { name: "Create demo record" }).click()
  await expect(page.locator(".admin-record-card").filter({ hasText: serviceName })).toBeVisible()
  await page.getByLabel("Filter by status").selectOption("Pending review")
  await expect(page.locator(".admin-record-card")).toHaveCount(1)
  await expect(page.locator(".admin-record-card").first()).toContainText(serviceName)
  await page.getByLabel("Search Services").fill("No matching demo service")
  await expect(page.getByText("No matching records")).toBeVisible()
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator(".admin-record-card").filter({ hasText: serviceName })).toBeVisible()
})

test("platform settings validate and persist with subscription plan preferences", async ({ page }) => {
  await openEnglishPage(page, "/admin/platform-settings")
  const featuredPrice = page.getByLabel("Featured listing price in ETB")
  await featuredPrice.fill("999999")
  await expect(featuredPrice).toHaveValue("100000")
  await page.getByLabel("Commission percentage").fill("12")
  await page.getByRole("button", { name: "Save configuration" }).click()
  await expect(page.getByRole("status")).toContainText("Demo configuration saved")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Commission percentage")).toHaveValue("12")
  await expect(page.getByLabel("Featured listing price in ETB")).toHaveValue("100000")

  await openEnglishPage(page, "/worker/premium-subscription")
  await page.getByLabel("Plan").selectOption("Worker Plus")
  const reminder = page.getByRole("switch", { name: "Toggle renewal reminder" })
  await reminder.click()
  await expect(reminder).toHaveAttribute("aria-checked", "true")
  await page.getByRole("button", { name: "Save configuration" }).click()
  await expect(page.getByRole("status")).toContainText("Demo plan preferences saved")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.getByLabel("Plan")).toHaveValue("Worker Plus")
  await expect(page.getByRole("switch", { name: "Toggle renewal reminder" })).toHaveAttribute("aria-checked", "true")
})
