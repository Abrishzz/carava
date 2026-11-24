import { NextResponse } from "next/server"
import { SESSION_COOKIE, SESSION_TTL_SECONDS, verifyOtp } from "@/lib/server/auth"
import { getDatabase } from "@/lib/server/db"
import { asString, jsonError, readJson } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = verifyOtp(getDatabase(), asString(body.phone, "phone"), asString(body.code, "code"))
    const response = NextResponse.json({ ok: true, token: result.token, user: result.user, expiresAt: result.expiresAt })
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    })
    return response
  } catch (error) {
    return jsonError(error)
  }
}
