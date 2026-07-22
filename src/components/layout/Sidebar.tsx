"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Library, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";

const items = [
  { label: "Flashcards", href: "/flashcards", icon: Layers },
  { label: "Vocabulary", href: "/vocabulary", icon: Library },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <>
      <header className="mobile-header">
        <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
        <Link href="/flashcards" className="brand-mark">Franc<span>Score</span></Link>
        <button className="icon-button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}>{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
      </header>
      {open ? <button className="drawer-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" /> : null}
      <aside className={`desktop-rail ${open ? "is-open" : ""}`}>
        <div className="rail-top"><Link href="/flashcards" className="brand-mark">Franc<span>Score</span></Link><button className="icon-button drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button></div>
        <p className="rail-eyebrow">Vocabulary studio</p>
        <nav className="rail-nav">{items.map(({ label, href, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`rail-link ${active ? "is-active" : ""}`}><Icon className="h-5 w-5" />{label}</Link>; })}</nav>
        <div className="rail-footer"><div className="rail-stat"><span>4,301 words</span><small>A0 through C1</small></div><button className="theme-switch" onClick={() => setTheme(isDark ? "light" : "dark")}><span>{isDark ? "Dark mode" : "Light mode"}</span>{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button></div>
      </aside>
      <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({ label, href, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} className={`bottom-link ${active ? "is-active" : ""}`}><span className="bottom-link-icon">{active ? <motion.span layoutId="bottom-nav-active" className="bottom-active-pill" transition={{ type: "spring", stiffness: 420, damping: 32 }} /> : null}<Icon className="relative z-10 h-5 w-5" /></span><span>{label}</span></Link>; })}</nav>
    </>
  );
}
