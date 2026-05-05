"use client";

import { Target, TrendingUp } from "lucide-react";
import type { ReadinessScore } from "@/lib/types";
import { formatCEFRLevel, getCEFRColor } from "@/lib/utils";

interface Props {
  score: ReadinessScore;
}

export function ReadinessScoreCard({ score }: Props) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score.overall / 100) * circumference;
  const trendLabel =
    score.overall >= 75 ? "Strong B2 track" : score.overall >= 55 ? "Building momentum" : "Early stage";

  return (
    <div className="surface-panel card-glow-green relative overflow-hidden rounded-[2rem] p-5 sm:p-7">
      <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-green/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px gradient-green" />

      <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-brand-green" />
            <h3 className="text-sm font-black text-text-secondary">
              B2 Readiness Score
            </h3>
          </div>
          <div
            className="text-xs font-medium px-2 py-0.5 rounded-full inline-block"
            style={{
              backgroundColor: `${getCEFRColor(score.cefrEstimate)}20`,
              color: getCEFRColor(score.cefrEstimate),
            }}
          >
            {formatCEFRLevel(score.cefrEstimate)} estimated
          </div>
        </div>
        <div className="badge badge-green hidden sm:flex">
          <TrendingUp className="w-3 h-3" />
          {trendLabel}
        </div>
      </div>

      <div className="relative z-10 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-44 w-44 shrink-0 lg:mx-0">
          <svg className="h-44 w-44 -rotate-90 drop-shadow-[0_0_30px_rgba(184,255,56,0.16)]" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#greenGradient)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#76b900" />
                <stop offset="100%" stopColor="#93d400" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black gradient-text-green">{score.overall}</span>
            <span className="text-xs font-bold text-text-muted">out of 100</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Listening", value: score.bySkill.LISTENING, color: "#8b5cf6" },
            { label: "Reading", value: score.bySkill.READING, color: "#3b82f6" },
            { label: "Writing", value: score.bySkill.WRITING, color: "#10b981" },
            { label: "Speaking", value: score.bySkill.SPEAKING, color: "#f59e0b" },
          ].map((skill) => (
            <div key={skill.label} className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-text-secondary">{skill.label}</span>
                <span className="font-black">{skill.value}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${skill.value}%`,
                    background: `linear-gradient(90deg, ${skill.color}, ${skill.color}cc)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
