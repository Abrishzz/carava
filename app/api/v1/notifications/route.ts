import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { listNotifications } from "@/lib/server/bookings"
import { getDatabase } from "@/lib/server/db"
import { jsonError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const db = getDatabase()
    const notifications = listNotifications(db, requireUser(db, request))
    return NextResponse.json({ notifications })
  } catch (error) {
    return jsonError(error)
  }
}
