import { NextResponse } from "next/server"
import { apiMode, demoMode } from "@/lib/api/config"
import { getDatabase } from "@/lib/server/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const db = getDatabase()
  const users = (db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count
  return NextResponse.json({ ok: true, mode: apiMode, demoMode, database: "sqlite", users })
}
