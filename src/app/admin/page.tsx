"use client";

import {
  Shield,
  HelpCircle,
  Library,
  BookOpen,
  PenTool,
  Mic,
  Headphones,
  FileText,
} from "lucide-react";
import Link from "next/link";

const adminStats = [
  { label: "Total Questions", value: "2,547", icon: HelpCircle, color: "#3b82f6" },
  { label: "Vocabulary Words", value: "834", icon: Library, color: "#22d3ee" },
  { label: "Reading Passages", value: "128", icon: BookOpen, color: "#10b981" },
  { label: "Writing Prompts", value: "64", icon: PenTool, color: "#8b5cf6" },
  { label: "Speaking Prompts", value: "48", icon: Mic, color: "#f59e0b" },
  { label: "Listening Audio", value: "312", icon: Headphones, color: "#f43f5e" },
];

const recentActivity = [
  { action: "Added vocabulary word", item: "auprès de", time: "2 hours ago" },
  { action: "Updated question", item: "Listening #245", time: "4 hours ago" },
  { action: "Published passage", item: "L'immigration au Canada", time: "1 day ago" },
  { action: "Added writing prompt", item: "Lettre formelle: Logement", time: "2 days ago" },
  { action: "Updated speaking prompt", item: "Monologue: Expérience", time: "3 days ago" },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-accent-rose" />
          Admin CMS
        </h1>
        <p className="text-sm text-text-secondary">
          Manage content for FrancScore
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {adminStats.map((stat) => (
          <Link
            key={stat.label}
            href={`/admin/${stat.label.toLowerCase().split(" ")[1] || ""}`}
            className="card group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `${stat.color}15`,
                  border: `1px solid ${stat.color}30`,
                }}
              >
                <stat.icon
                  className="w-5 h-5"
                  style={{ color: stat.color }}
                />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-text-muted">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-text-secondary" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-bg-input"
            >
              <div>
                <div className="text-sm">{item.action}</div>
                <div className="text-xs text-text-muted">{item.item}</div>
              </div>
              <span className="text-xs text-text-muted">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
