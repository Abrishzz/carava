"use client"

import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { translateText } from "@/lib/carava-i18n"
import { useDemoStorageState } from "@/lib/use-demo-storage-state"
import type { Locale } from "@/lib/carava-data"

export default function NotFound() {
  const [locale] = useDemoStorageState<Locale>("carava-demo-locale", "am")

  return (
    <main className="page-wrap">
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon"><Search size={20} /></div>
          <h1>{translateText(locale, "We couldn't find that page")}</h1>
          <p>{translateText(locale, "Try a new search or head back to the marketplace to find your next good thing.")}</p>
          <Link className="button button-primary" href="/">{translateText(locale, "Back to Carava")} <ArrowRight size={14} /></Link>
        </div>
      </div>
    </main>
  )
}
