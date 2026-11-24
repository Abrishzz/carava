import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { createBooking, listBookings } from "@/lib/server/bookings"
import { getDatabase } from "@/lib/server/db"
import { jsonError, readJson } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const db = getDatabase()
    const bookings = listBookings(db, requireUser(db, request))
    return NextResponse.json({ bookings })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const db = getDatabase()
    const actor = requireUser(db, request)
    const body = await readJson(request)
    const booking = createBooking(db, actor, {
      workerId: String(body.workerId ?? ""),
      service: String(body.service ?? ""),
      scheduledAt: String(body.scheduledAt ?? ""),
      amountCents: Number(body.amountCents),
    })
    return NextResponse.json({ booking }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
