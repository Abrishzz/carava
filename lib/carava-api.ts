import { categories, jobs, services, workers, type Job, type Worker } from "./carava-data"

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface SearchFilters {
  query?: string
  category?: string
  location?: string
  minRating?: number
  availableOnly?: boolean
  verifiedOnly?: boolean
  maxPrice?: number
  minExperience?: number
  language?: string
  radiusKm?: number
  sortBy?: "relevance" | "rating" | "price-low" | "price-high" | "newest"
  page?: number
  pageSize?: number
}

export interface MarketplaceApi {
  searchWorkers(filters?: SearchFilters): Promise<PageResult<Worker>>
  searchJobs(query?: string): Promise<PageResult<Job>>
}

const pageResult = <T,>(items: T[], page = 1, pageSize = 12): PageResult<T> => ({
  items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize,
})

function categoryAliases(category = "") {
  const normalized = category.trim().toLowerCase()
  if (!normalized) return []
  const subcategory = categories.flatMap((item) => item.subcategories).find((value) => value.toLowerCase() === normalized)
  if (subcategory) return [subcategory.toLowerCase()]
  const matched = categories.find((item) => item.name.toLowerCase() === normalized)
  if (matched) return [matched.name.toLowerCase(), ...matched.subcategories.map((value) => value.toLowerCase())]
  return [normalized]
}

function relevanceScore(worker: Worker, query: string, category: string) {
  let score = worker.rating + worker.reviewCount / 100
  if (query) {
    const name = worker.name.toLowerCase()
    const headline = worker.headline.toLowerCase()
    const skills = worker.skills.join(" ").toLowerCase()
    const about = worker.about.toLowerCase()
    if (name.includes(query)) score += 8
    if (headline.includes(query)) score += 6
    if (skills.includes(query)) score += 4
    if (about.includes(query)) score += 2
    if (!name.includes(query) && !headline.includes(query) && !skills.includes(query) && !about.includes(query)) score -= 10
  }
  if (category && worker.category.toLowerCase() === category.toLowerCase()) score += 5
  if (worker.verified) score += 1
  if (worker.available) score += 1
  return score
}

export const mockMarketplaceApi: MarketplaceApi = {
  async searchWorkers(filters = {}) {
    const query = filters.query?.trim().toLowerCase() ?? ""
    const aliases = categoryAliases(filters.category)
    const searchable = (worker: Worker) => [worker.name, worker.headline, worker.category, worker.about, ...worker.skills, ...worker.languages].join(" ").toLowerCase()
    const filtered = workers.filter((worker) => {
      const matchesQuery = !query || searchable(worker).includes(query)
      const matchesCategory = !aliases.length || aliases.some((alias) => worker.category.toLowerCase().includes(alias) || worker.skills.some((skill) => skill.toLowerCase().includes(alias)))
      const matchesLocation = !filters.location || worker.location.toLowerCase().includes(filters.location.toLowerCase())
      const matchesPrice = filters.maxPrice === undefined || worker.hourlyRate <= filters.maxPrice
      const matchesExperience = filters.minExperience === undefined || worker.experience >= filters.minExperience
      const matchesLanguage = !filters.language || worker.languages.some((language) => language.toLowerCase() === filters.language?.toLowerCase())
      const matchesRadius = filters.radiusKm === undefined || (worker.distanceKm ?? 0) <= filters.radiusKm
      return matchesQuery && matchesCategory && matchesLocation && matchesPrice && matchesExperience && matchesLanguage && matchesRadius && (!filters.minRating || worker.rating >= filters.minRating) && (!filters.availableOnly || worker.available) && (!filters.verifiedOnly || worker.verified)
    })
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case "rating": return b.rating - a.rating || b.reviewCount - a.reviewCount
        case "price-low": return a.hourlyRate - b.hourlyRate || b.rating - a.rating
        case "price-high": return b.hourlyRate - a.hourlyRate || b.rating - a.rating
        case "newest": return (b.joinedAt ?? "").localeCompare(a.joinedAt ?? "") || b.id.localeCompare(a.id)
        case "relevance":
        default: return relevanceScore(b, query, filters.category ?? "") - relevanceScore(a, query, filters.category ?? "")
      }
    })
    return pageResult(sorted, filters.page, filters.pageSize)
  },
  async searchJobs(query = "") {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = jobs.filter((job) => !normalizedQuery || [job.title, job.company, job.category, job.location, job.description].some((item) => item.toLowerCase().includes(normalizedQuery)))
    return pageResult(filtered)
  },
}

const apiBase = process.env.NEXT_PUBLIC_CARAVA_API_URL?.replace(/\/$/, "")
export const marketplaceDataMode = process.env.NEXT_PUBLIC_CARAVA_DATA_SOURCE === "rest" && apiBase ? "rest" : "mock"
export const marketplaceApi: MarketplaceApi = marketplaceDataMode === "rest" && apiBase
  ? {
      async searchWorkers(filters = {}) {
        const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)]))
        const response = await fetch(`${apiBase}/api/v1/workers?${params}`)
        if (!response.ok) throw new Error("Unable to load workers. Please try again.")
        return response.json() as Promise<PageResult<Worker>>
      },
      async searchJobs(query = "") {
        const response = await fetch(`${apiBase}/api/v1/jobs?search=${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error("Unable to load jobs. Please try again.")
        return response.json() as Promise<PageResult<Job>>
      },
    }
  : mockMarketplaceApi

export { categories, jobs, services, workers }
