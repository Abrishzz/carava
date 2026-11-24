import { notFound } from "next/navigation"
import { CaravaApp } from "@/components/carava/carava-app"
import { businessProfiles, dashboardSections, jobs, services, slugify, workers } from "@/lib/carava-data"

const publicPages = new Set(["search", "categories", "jobs", "login", "register", "forgot-password", "verify", "onboarding", "about", "help", "contact", "privacy", "terms"])
const dashboardRoles = new Set(Object.keys(dashboardSections))

function isSupportedRoute(slug: string[]) {
  if (slug.length === 1) return publicPages.has(slug[0]) || dashboardRoles.has(slug[0])
  if (slug.length !== 2) return false

  const [page, id] = slug
  if (page === "workers") return workers.some((worker) => worker.id === id)
  if (page === "services") return services.some((service) => service.id === id)
  if (page === "businesses") return businessProfiles.some((business) => business.id === id)
  if (page === "jobs") return jobs.some((job) => job.id === id) || /^job-(?:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\d+-[0-9a-z]+)$/i.test(id)

  return dashboardRoles.has(page) && dashboardSections[page].some((section) => slugify(section) === id)
}

export default async function MarketplaceRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (!isSupportedRoute(slug)) notFound()
  return <CaravaApp />
}
