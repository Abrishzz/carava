import { NextResponse } from "next/server"

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

export function badRequest(message: string) {
  return new ApiError(400, "bad_request", message)
}

export function unauthorized(message = "Sign in is required.") {
  return new ApiError(401, "unauthorized", message)
}

export function forbidden(message = "This account cannot perform that action.") {
  return new ApiError(403, "forbidden", message)
}

export function notFound(message = "Record not found.") {
  return new ApiError(404, "not_found", message)
}

export function conflict(message: string) {
  return new ApiError(409, "conflict", message)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json()
    if (!value || typeof value !== "object" || Array.isArray(value)) throw badRequest("A JSON object is required.")
    return value as Record<string, unknown>
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw badRequest("A valid JSON body is required.")
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status })
  }
  console.error("Unhandled API error", error)
  return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong." } }, { status: 500 })
}

export function asString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw badRequest(`${field} is required.`)
  return value.trim()
}
