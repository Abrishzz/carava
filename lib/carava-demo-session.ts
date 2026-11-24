import { readDemoStorageSnapshot, writeDemoStorageSnapshot } from "./use-demo-storage-state"

export type DemoAccountType = "customer" | "worker" | "business"

export const accountTypeKey = "carava-demo-account-type"
export const phoneKey = "carava-demo-phone"
export const onboardingKey = "carava-demo-onboarding"
export const signedInKey = "carava-demo-signed-in"

export const roleForAccountType = (accountType: DemoAccountType): "account" | "worker" | "business" =>
  accountType === "worker" ? "worker" : accountType === "business" ? "business" : "account"

/** The storage hook serializes strings as JSON; accept both quoted and raw legacy values. */
export function parseAccountType(value: string | null): DemoAccountType {
  const normalized = (value ?? "").replace(/^"|"$/g, "")
  return normalized === "worker" || normalized === "business" || normalized === "customer" ? normalized : "customer"
}

export function readAccountType(): DemoAccountType {
  if (typeof window === "undefined") return "customer"
  return parseAccountType(readDemoStorageSnapshot(accountTypeKey, "customer"))
}

/** Profile keys used by the dashboard editors. */
export function profileKeyFor(role: "account" | "worker" | "business") {
  return `carava-demo-profile-${role}`
}

export function profileHeadlineKeyFor(role: "account" | "worker" | "business") {
  return `carava-demo-profile-headline-${role}`
}

export function profileAboutKeyFor(role: "account" | "worker" | "business") {
  return `carava-demo-profile-about-${role}`
}

export type OnboardingProfile = { accountType?: string; name?: string; category?: string; neighborhood?: string; completedAt?: string }

export function readOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === "undefined") return null
  const stored = readDemoStorageSnapshot<OnboardingProfile>(onboardingKey, {} as OnboardingProfile)
  return Object.keys(stored).length > 0 ? stored : null
}

export function writeOnboardingProfile(accountType: DemoAccountType, name: string, category: string, neighborhood: string) {
  if (typeof window === "undefined") return
  const role = roleForAccountType(accountType)
  writeDemoStorageSnapshot(profileKeyFor(role), name.trim())
  writeDemoStorageSnapshot(profileHeadlineKeyFor(role), category.trim() || "A Carava community member")
  writeDemoStorageSnapshot(profileAboutKeyFor(role), `Lives and works around ${neighborhood || "Adama"}. New to this Carava demo workspace.`)
  writeDemoStorageSnapshot(onboardingKey, { accountType, name: name.trim(), category, neighborhood, completedAt: new Date().toISOString() })
  writeDemoStorageSnapshot(signedInKey, true)
}

export function isPhoneValid(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 9 && digits.length <= 15
}
