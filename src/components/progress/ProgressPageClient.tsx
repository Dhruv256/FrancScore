"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Calendar, Clock, Target, TrendingUp, Zap } from "lucide-react";
import type { AnalyticsData, ReadinessScore, SkillProgress } from "@/lib/types";
import { formatCEFRLevel, formatSkillType, getSkillColor } from "@/lib/utils";

const subscribe = () => () => {};

export function ProgressPageClient({
  analyticsData,
  readinessScore,
  skillProgress,
  totalXp,
  currentStreak,
  totalQuestions,
}: {
  analyticsData: AnalyticsData[];
  readinessScore: ReadinessScore;
  skillProgress: SkillProgress[];
  totalXp: number;
  currentStreak: number;
  totalQuestions: number;
}) {
  const hasMounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <BarChart3 className="w-6 h-6 text-brand-green" />
          Progress Analytics
        </h1>
        <p className="text-sm text-text-secondary">Track your improvement across all skills</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<Target className="w-6 h-6 text-brand-green mx-auto mb-2" />} value={`${readinessScore.overall}%`} label="B2 Readiness" />
        <SummaryCard icon={<Zap className="w-6 h-6 text-accent-amber mx-auto mb-2" />} value={totalXp.toLocaleString()} label="Total XP" />
        <SummaryCard icon={<Calendar className="w-6 h-6 text-brand-purple mx-auto mb-2" />} value={String(currentStreak)} label="Day Streak" />
        <SummaryCard icon={<Clock className="w-6 h-6 text-accent-cyan mx-auto mb-2" />} value={String(totalQuestions)} label="Questions Done" />
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-green" />
          Skill Progress Over Time
        </h2>
        <div className="h-72">
          {hasMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(value) => value.slice(5)} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="listening" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Listening" />
                <Line type="monotone" dataKey="reading" stroke="#3b82f6" strokeWidth={2} dot={false} name="Reading" />
                <Line type="monotone" dataKey="writing" stroke="#10b981" strokeWidth={2} dot={false} name="Writing" />
                <Line type="monotone" dataKey="speaking" stroke="#f59e0b" strokeWidth={2} dot={false} name="Speaking" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-xl bg-bg-input" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Daily XP Earned</h2>
          <div className="h-48">
            {hasMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => value.slice(8)} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="xp" fill="#b6c56f" radius={[4, 4, 0, 0]} name="XP" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-bg-input" />
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Questions Answered</h2>
          <div className="h-48">
            {hasMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => value.slice(8)} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="questionsAnswered" stroke="#9333ea" fill="rgba(147,51,234,0.1)" strokeWidth={2} name="Questions" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-bg-input" />
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Skill Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skillProgress.map((skill) => (
            <div key={skill.skill} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{formatSkillType(skill.skill)}</h3>
                <span className="badge badge-blue">{formatCEFRLevel(skill.cefrEstimate)}</span>
              </div>
              <div className="text-3xl font-bold mb-1">{skill.percentage}%</div>
              <div className="text-xs text-text-muted mb-3">
                {skill.correctAnswers}/{skill.totalQuestions} correct · Last: {skill.lastPracticed.slice(0, 10)}
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill h-2" style={{ width: `${skill.percentage}%`, background: getSkillColor(skill.skill) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card text-center py-4">
      {icon}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "#161821",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#f1f5f9",
} as const;
