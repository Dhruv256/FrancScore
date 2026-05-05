"use client";

import Link from "next/link";
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import type { SkillProgress, SkillType } from "@/lib/types";
import {
  formatCEFRLevel,
  formatSkillType,
  getCEFRColor,
  getSkillColor,
} from "@/lib/utils";

const skillIcons: Record<SkillType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenTool,
  SPEAKING: Mic,
  VOCABULARY: BookOpen,
};

const skillPaths: Record<SkillType, string> = {
  LISTENING: "/practice/listening",
  READING: "/practice/reading",
  WRITING: "/practice/writing",
  SPEAKING: "/practice/speaking",
  VOCABULARY: "/vocabulary",
};

interface Props {
  skill: SkillProgress;
}

export function SkillProgressCard({ skill }: Props) {
  const Icon = skillIcons[skill.skill];
  const TrendIcon =
    skill.trend === "UP"
      ? TrendingUp
      : skill.trend === "DOWN"
      ? TrendingDown
      : Minus;
  const trendColor =
    skill.trend === "UP"
      ? "text-status-success"
      : skill.trend === "DOWN"
      ? "text-accent-rose"
      : "text-text-muted";
  const skillColor = getSkillColor(skill.skill);

  return (
    <div className="card group overflow-hidden p-5">
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition-opacity group-hover:opacity-80"
        style={{ backgroundColor: `${skillColor}22` }}
      />
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: `${skillColor}15`,
            border: `1px solid ${skillColor}30`,
          }}
        >
          {Icon && <Icon className="w-5 h-5" style={{ color: skillColor }} />}
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${getCEFRColor(skill.cefrEstimate)}15`,
              color: getCEFRColor(skill.cefrEstimate),
            }}
          >
            {formatCEFRLevel(skill.cefrEstimate)}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-bold text-text-secondary mb-1">
        {formatSkillType(skill.skill)}
      </h3>
      <div className="text-4xl font-black mb-4">{skill.percentage}%</div>

      <div className="progress-bar mb-4">
        <div
          className="progress-fill"
          style={{
            width: `${skill.percentage}%`,
            background: `linear-gradient(90deg, ${skillColor}, ${skillColor}cc)`,
          }}
        />
      </div>

      <Link
        href={skillPaths[skill.skill]}
        className="flex items-center gap-1 text-xs font-black text-text-muted group-hover:text-brand-green transition-colors"
      >
        Practice now
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
