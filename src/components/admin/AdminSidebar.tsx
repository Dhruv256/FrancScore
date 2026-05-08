"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HelpCircle,
  Library,
  BookOpen,
  PenTool,
  Mic,
  Headphones,
  Trophy,
  ClipboardList,
  ListChecks,
  ArrowLeft,
  Shield,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard,
  HelpCircle,
  Library,
  BookOpen,
  PenTool,
  Mic,
  Headphones,
  Trophy,
  ClipboardList,
  ListChecks,
};

const navItems = [
  { label: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { label: "Questions", href: "/admin/questions", icon: "HelpCircle" },
  { label: "Vocabulary", href: "/admin/vocabulary", icon: "Library" },
  { label: "Vocab Import", href: "/admin/import/vocabulary", icon: "Library" },
  { label: "Passages", href: "/admin/passages", icon: "BookOpen" },
  { label: "French Book", href: "/admin/book", icon: "BookOpen" },
  { label: "Writing Prompts", href: "/admin/writing", icon: "PenTool" },
  { label: "Speaking Prompts", href: "/admin/speaking", icon: "Mic" },
  { label: "Listening Audio", href: "/admin/listening", icon: "Headphones" },
  { label: "Missions", href: "/admin/missions", icon: "ListChecks" },
  { label: "Badges", href: "/admin/badges", icon: "Trophy" },
  { label: "Mock Tests", href: "/admin/mocks", icon: "ClipboardList" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-bg-secondary border-r border-border-default flex flex-col z-50 hidden lg:flex">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-default">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-rose/20 border border-accent-rose/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent-rose" />
          </div>
          <span className="text-base font-bold">Admin CMS</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-accent-rose/10 text-accent-rose font-medium"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
              }`}
            >
              {Icon && <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-accent-rose" : ""}`} />}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border-default">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          Back to App
        </Link>
      </div>
    </aside>
  );
}
