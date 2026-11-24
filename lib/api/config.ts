export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"

export const apiMode = demoMode ? "demo" : "api"
