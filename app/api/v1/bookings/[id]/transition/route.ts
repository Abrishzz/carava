import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { transitionBooking } from "@/lib/server/bookings"
import { getDatabase } from "@/lib/server/db"
import { asString, jsonError, readJson } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = getDatabase()
    const actor = requireUser(db, request)
    const { id } = await context.params
    const body = await readJson(request)
    const booking = transitionBooking(db, actor, id, asString(body.action, "action"))
    return NextResponse.json({ booking })
  } catch (error) {
    return jsonError(error)
  }
}
