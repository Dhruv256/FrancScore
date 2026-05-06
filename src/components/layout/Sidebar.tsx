"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Library,
  Layers,
  FileCheck,
  BarChart3,
  Award,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronLeft,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard,
  Swords,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Library,
  Layers,
  FileCheck,
  BarChart3,
  Award,
};

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "War Mode", href: "/dashboard/war-mode", icon: "Swords" },
  { label: "Listening Lab", href: "/practice/listening", icon: "Headphones" },
  { label: "Reading Lab", href: "/practice/reading", icon: "BookOpen" },
  { label: "French All-in-One Book", href: "/book", icon: "Library" },
  { label: "Writing Coach", href: "/practice/writing", icon: "PenTool" },
  { label: "Speaking Coach", href: "/practice/speaking", icon: "Mic" },
  { label: "Vocabulary", href: "/vocabulary", icon: "Library" },
  { label: "Flashcards", href: "/vocabulary/flashcards", icon: "Layers" },
  { label: "Mock Tests", href: "/mocks", icon: "FileCheck" },
  { label: "Progress", href: "/progress", icon: "BarChart3" },
  { label: "Badges", href: "/badges", icon: "Award" },
];

type SidebarProps = {
  userSummary: {
    fullName: string;
    totalXp: number;
    currentStreak: number;
  };
};

export function Sidebar({ userSummary }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 btn btn-icon btn-secondary shadow-2xl"
        id="sidebar-toggle"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/55 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 surface-phone border-r border-white/10 flex flex-col transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        } ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } !rounded-none !border-l-0 !border-t-0 !border-b-0 shadow-[18px_0_70px_rgba(8,8,8,0.24)]`}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full gradient-green flex items-center justify-center shrink-0 shadow-[0_12px_28px_rgba(255,122,26,0.24)]">
                <span className="text-sm font-black text-text-inverse">F</span>
              </div>
              <span className="text-base font-black text-text-inverse">
                Franc<span className="gradient-text-green">Score</span>
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-10 h-10 rounded-full gradient-green flex items-center justify-center mx-auto">
              <span className="text-sm font-black text-text-inverse">F</span>
            </div>
          )}

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden grid h-10 w-10 place-items-center rounded-full text-text-muted hover:bg-white/10 hover:text-text-inverse"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-white/10 hover:text-text-inverse"
            aria-label="Collapse navigation"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* User info mini card */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-3 rounded-3xl border border-white/10 bg-white/[0.07] p-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl gradient-green-purple flex items-center justify-center text-text-inverse font-black text-sm">
                {userSummary.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black truncate">
                  {userSummary.fullName}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-brand-green" />
                    {userSummary.totalXp} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-brand-green" />
                    {userSummary.currentStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-brand-green text-[#111111] shadow-[0_12px_26px_rgba(255,122,26,0.2)]"
                    : "text-text-secondary hover:text-text-inverse hover:bg-white/[0.06]"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {Icon && (
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? "text-[#111111]" : ""
                    }`}
                  />
                )}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-white/10">
          <SignOutButton
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-text-muted transition-colors hover:bg-accent-rose/10 hover:text-accent-rose w-full ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
