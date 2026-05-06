import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Headphones,
  HelpCircle,
  Library,
  ListChecks,
  Mic,
  PenTool,
  Shield,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

const adminStats = [
  { label: "Questions", table: "questions", href: "/admin/questions", icon: HelpCircle },
  { label: "Vocabulary", table: "vocabulary", href: "/admin/vocabulary", icon: Library },
  { label: "Passages", table: "passages", href: "/admin/passages", icon: BookOpen },
  { label: "Writing", table: "writing_prompts", href: "/admin/writing", icon: PenTool },
  { label: "Speaking", table: "speaking_prompts", href: "/admin/speaking", icon: Mic },
  { label: "Listening", table: "questions", href: "/admin/listening", icon: Headphones, skill: "LISTENING" },
  { label: "Missions", table: "daily_tasks", href: "/admin/missions", icon: ListChecks },
  { label: "Mock Tests", table: "mock_tests", href: "/admin/mocks", icon: ClipboardList },
];

export default async function AdminOverviewPage() {
  const counts = await getAdminCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-accent-rose" />
          Admin CMS
        </h1>
        <p className="text-sm text-text-secondary">
          Manage real FrancScore learning content, publication status, missions, and imports.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {adminStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="card group">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-green/25 bg-brand-green/10">
                  <Icon className="h-5 w-5 text-brand-green" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{counts[stat.label] ?? 0}</div>
                  <div className="text-xs text-text-muted">{stat.label}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-base font-semibold">Import and audio pipeline</h2>
        <div className="grid gap-3 text-sm text-text-secondary md:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-bg-input p-4">
            <div className="font-black text-text-primary">Vocabulary import</div>
            <p className="mt-1">
              Run <code>npm run import:vocab -- --file=../French_schedule.xlsx</code> from the project root.
            </p>
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-input p-4">
            <div className="font-black text-text-primary">Listening audio</div>
            <p className="mt-1">
              Run <code>npm run generate:audio</code> after applying the learning upgrade seed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getAdminCounts() {
  const supabase = createAdminClient();
  const entries = await Promise.all(
    adminStats.map(async (stat) => {
      let query = supabase
        .from(stat.table)
        .select("id", { count: "exact", head: true });

      if (stat.skill) {
        query = query.eq("skill_type", stat.skill);
      }

      const { count, error } = await query;
      if (error) {
        return [stat.label, 0] as const;
      }
      return [stat.label, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<string, number>;
}
