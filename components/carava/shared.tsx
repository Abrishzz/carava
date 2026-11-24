"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Bell, BriefcaseBusiness, CalendarClock, ChevronDown, Grid2X2, House, Menu, MapPin, Search, ShieldCheck, Sparkles, X } from "lucide-react"
import { neighborhoods, type Locale } from "@/lib/carava-data"
import { localeLabels, t, translateText } from "@/lib/carava-i18n"
import { marketplaceDataMode } from "@/lib/carava-api"

export function Brand({ compact = false, locale = "en" }: { compact?: boolean; locale?: Locale }) {
  return <Link aria-label={translateText(locale, "Carava home")} className="brand" href="/"><span className="brand-mark"><span /></span><span>carava</span>{!compact && <span className="brand-tag">{translateText(locale, "Work, closer.")}</span>}</Link>
}

export function SiteHeader({ locale, onLocaleChange, onSignOut, signedIn = false, unreadCount = 0, workspaceHref = "/account" }: { locale: Locale; onLocaleChange: (locale: Locale) => void; onSignOut?: () => void; signedIn?: boolean; unreadCount?: number; workspaceHref?: string }) {
  const pathname = usePathname() || "/"
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [
    [t(locale, "workers"), "/search"],
    [t(locale, "jobs"), "/jobs"],
    [t(locale, "categories"), "/categories"],
    [t(locale, "businesses"), "/businesses/sample-business"],
  ]
  const tabs = [
    { href: "/", label: t(locale, "home"), icon: House, active: pathname === "/" },
    { href: "/search", label: t(locale, "search"), icon: Search, active: pathname.startsWith("/search") },
    { href: "/account/bookings", label: translateText(locale, "Requests"), icon: CalendarClock, active: pathname.startsWith("/account/bookings") },
    { href: "/account/notifications", label: translateText(locale, "Alerts"), icon: Bell, active: pathname.startsWith("/account/notifications"), alert: unreadCount > 0 },
  ]
  return <>
    <header className="site-header"><div className="site-header-inner"><Brand locale={locale} />
      <nav aria-label={translateText(locale, "Main navigation")} className={menuOpen ? "main-nav is-open" : "main-nav"} id="main-navigation">
        {nav.map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
        <Link className="mobile-nav-account" href="/account"><BriefcaseBusiness size={16} /> {t(locale, "dashboard")}</Link>
        <Link className="mobile-nav-join" href="/register" onClick={() => setMenuOpen(false)}>{t(locale, "join")} <ArrowRight size={15} /></Link>
      </nav>
      <div className="header-actions">
        <label className="locale-picker"><span className="sr-only">{translateText(locale, "Choose language")}</span><select aria-label={translateText(locale, "Choose language")} onChange={(event) => onLocaleChange(event.target.value as Locale)} value={locale}>{Object.entries(localeLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><ChevronDown aria-hidden="true" size={14} /></label>
        <Link aria-label={translateText(locale, "Notifications")} className="icon-button header-bell" href="/account/notifications"><Bell size={18} />{unreadCount > 0 && <span className="notification-dot" />}</Link>
        {signedIn ? <>
          <Link className="header-login" href={workspaceHref}>{translateText(locale, "Workspace")}</Link>
          <button aria-label={translateText(locale, "Sign out")} className="button button-outline header-join" onClick={onSignOut} type="button">{translateText(locale, "Sign out")}</button>
        </> : <>
          <Link className="header-login" href="/login">{t(locale, "login")}</Link>
          <Link className="button button-primary header-join" href="/register">{t(locale, "join")} <ArrowRight size={15} /></Link>
        </>}
      </div>
      <button aria-controls="main-navigation" aria-expanded={menuOpen} aria-label={translateText(locale, menuOpen ? "Close navigation" : "Open navigation")} className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} type="button">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
    </div></header>
    <nav aria-label={translateText(locale, "Main navigation")} className="mobile-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return <Link aria-current={tab.active ? "page" : undefined} className={tab.active ? "mobile-tab is-active" : "mobile-tab"} href={tab.href} key={tab.href} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" size={20} /><span>{tab.label}</span>{tab.alert && <span className="mobile-tab-dot" />}</Link>
      })}
      <button aria-controls="main-navigation" aria-expanded={menuOpen} aria-label={translateText(locale, "More")} className={menuOpen ? "mobile-tab mobile-tab-button is-active" : "mobile-tab mobile-tab-button"} onClick={() => setMenuOpen(!menuOpen)} type="button"><Grid2X2 aria-hidden="true" size={20} /><span>{translateText(locale, "More")}</span></button>
    </nav>
  </>
}

export function DashboardMobileTabBar({ locale, unreadCount = 0, workspaceHref = "/account" }: { locale: Locale; unreadCount?: number; workspaceHref?: string }) {
  const pathname = usePathname() || "/"
  const [menuOpen, setMenuOpen] = useState(false)
  const tabs = [
    { href: "/", label: t(locale, "home"), icon: House, active: pathname === "/" },
    { href: "/search", label: t(locale, "search"), icon: Search, active: pathname.startsWith("/search") },
    { href: "/account/bookings", label: translateText(locale, "Requests"), icon: CalendarClock, active: pathname.startsWith("/account/bookings") },
    { href: "/account/notifications", label: translateText(locale, "Alerts"), icon: Bell, active: pathname.startsWith("/account/notifications"), alert: unreadCount > 0 },
  ]
  const menuLinks = [
    [t(locale, "home"), "/"],
    [t(locale, "workers"), "/search"],
    [t(locale, "jobs"), "/jobs"],
    [t(locale, "categories"), "/categories"],
    [t(locale, "dashboard"), workspaceHref],
  ]
  return <>
    <nav aria-label={translateText(locale, "Main navigation")} className="mobile-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return <Link aria-current={tab.active ? "page" : undefined} className={tab.active ? "mobile-tab is-active" : "mobile-tab"} href={tab.href} key={tab.href} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" size={20} /><span>{tab.label}</span>{tab.alert && <span className="mobile-tab-dot" />}</Link>
      })}
      <button aria-controls="mobile-dashboard-menu" aria-expanded={menuOpen} aria-label={translateText(locale, "More")} className={menuOpen ? "mobile-tab mobile-tab-button is-active" : "mobile-tab mobile-tab-button"} onClick={() => setMenuOpen(!menuOpen)} type="button"><Grid2X2 aria-hidden="true" size={20} /><span>{translateText(locale, "More")}</span></button>
    </nav>
    {menuOpen && <nav aria-label={translateText(locale, "Main navigation")} className="mobile-dashboard-menu is-open" id="mobile-dashboard-menu">{menuLinks.map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav>}
  </>
}

export function Footer({ locale }: { locale: Locale }) {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Brand locale={locale} /><p>{translateText(locale, "Local work, closer to home. Making opportunity and reliable help easier to find in Adama.")}</p><div className="footer-locale"><MapPin size={14} /> {translateText(locale, "Adama, Ethiopia")}</div></div>
    <div className="footer-column"><h3>{translateText(locale, "Explore")}</h3><Link href="/search">{t(locale, "searchWorkers")}</Link><Link href="/jobs">{translateText(locale, "Find a job")}</Link><Link href="/categories">{translateText(locale, "Browse services")}</Link><Link href="/businesses/sample-business">{t(locale, "businesses")}</Link></div>
    <div className="footer-column"><h3>{translateText(locale, "Carava")}</h3><Link href="/about">{translateText(locale, "About us")}</Link><Link href="/help">{translateText(locale, "Help center")}</Link><Link href="/contact">{translateText(locale, "Contact")}</Link><Link href="/register">{translateText(locale, "Join the community")}</Link></div>
    <div className="footer-column"><h3>{translateText(locale, "Good to know")}</h3><Link href="/privacy">{translateText(locale, "Privacy")}</Link><Link href="/terms">{translateText(locale, "Terms of use")}</Link><Link href="/help">{translateText(locale, "Safety on Carava")}</Link><div className="trust-note"><ShieldCheck size={16} /> {translateText(locale, "Your trust comes first")}</div></div></div>
    <div className="footer-bottom"><span>© 2026 Carava Marketplace. {translateText(locale, marketplaceDataMode === "mock" ? "Demo data · no live records." : "Live API data source.")}</span><span>{translateText(locale, "Made for opportunity in Adama")} <Sparkles size={13} /></span></div></footer>
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

export function Toast({ locale = "en", message, onClose }: { locale?: Locale; message: string; onClose: () => void }) {
  if (!message) return null
  return <div aria-live="polite" className="toast" role="status"><span className="toast-check">✓</span><span>{message}</span><button aria-label={translateText(locale, "Dismiss notification")} className="toast-close" onClick={onClose} type="button"><X size={16} /></button></div>
}

export function SearchBox({ locale, initialValue = "", initialLocation = "", onSubmit, compact = false }: { locale: Locale; initialValue?: string; initialLocation?: string; onSubmit: (query: string, location?: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState(initialValue)
  const [location, setLocation] = useState(initialLocation)
  return <form className={compact ? "search-box search-box-compact" : "search-box"} onSubmit={(event) => { event.preventDefault(); onSubmit(query, location) }} role="search">
    <Search aria-hidden="true" className="search-box-icon" size={19} />
    <label className="sr-only" htmlFor="marketplace-search">{t(locale, "searchPlaceholder")}</label>
    <input autoComplete="off" id="marketplace-search" onChange={(event) => setQuery(event.target.value)} placeholder={t(locale, "searchPlaceholder")} value={query} />
    <label className="search-location"><MapPin aria-hidden="true" size={16} /><span className="sr-only">{translateText(locale, "Choose neighborhood")}</span><select aria-label={translateText(locale, "Choose neighborhood")} onChange={(event) => setLocation(event.target.value)} value={location}><option value="">{t(locale, "location")}</option>{neighborhoods.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown aria-hidden="true" size={14} /></label>
    <button aria-label={t(locale, "search")} className="button button-primary search-submit" type="submit"><Search size={17} /><span>{t(locale, "search")}</span></button>
  </form>
}

export function WorkerAvatar({ initials, photo = false, className = "" }: { initials: string; photo?: boolean; className?: string }) {
  return <div aria-label={`${initials} profile`} className={`worker-avatar ${className}`} role="img">{photo ? <Image alt="Adama service professional" fill sizes="64px" src="/carava-hero.png" /> : <span>{initials}</span>}</div>
}
