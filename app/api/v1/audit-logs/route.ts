import { NextResponse } from "next/server"
import { requireRole } from "@/lib/server/auth"
import { listAuditLogs } from "@/lib/server/bookings"
import { getDatabase } from "@/lib/server/db"
import { jsonError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const db = getDatabase()
    const logs = listAuditLogs(db, requireRole(db, request, ["admin"]))
    return NextResponse.json({ auditLogs: logs })
  } catch (error) {
    return jsonError(error)
  }
}
