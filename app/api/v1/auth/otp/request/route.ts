import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/server/db"
import { requestOtp } from "@/lib/server/auth"
import { asString, jsonError, readJson } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = requestOtp(getDatabase(), asString(body.phone, "phone"))
    return NextResponse.json({ ok: true, phone: result.phone, expiresAt: result.expiresAt, devOtp: result.devOtp })
  } catch (error) {
    return jsonError(error)
  }
}
