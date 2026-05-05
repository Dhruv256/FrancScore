"use client";

import { Filter } from "lucide-react";
import {
  CEFR_LEVELS,
  EXAM_TYPES,
  TOPIC_TYPES,
  TRAP_TYPES,
} from "@/lib/constants";
import type { PracticeExamFilter, PracticeFilters, PracticeLevelFilter, PracticeTopicFilter, PracticeTrapFilter } from "@/lib/practice/types";
import { formatCEFRLevel, formatExamType, formatTopicType } from "@/lib/utils";

type PracticeFilterBarProps = {
  filters: PracticeFilters;
  onChange: (nextFilters: PracticeFilters) => void;
};

export function PracticeFilterBar({
  filters,
  onChange,
}: PracticeFilterBarProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-brand-green" />
        <h2 className="text-sm font-semibold">Filters</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-text-muted">Exam</span>
          <select
            className="input"
            value={filters.examType}
            onChange={(event) =>
              onChange({
                ...filters,
                examType: event.target.value as PracticeExamFilter,
              })
            }
          >
            <option value="ALL">All exams</option>
            {EXAM_TYPES.map((examType) => (
              <option key={examType} value={examType}>
                {formatExamType(examType)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-text-muted">Level</span>
          <select
            className="input"
            value={filters.level}
            onChange={(event) =>
              onChange({
                ...filters,
                level: event.target.value as PracticeLevelFilter,
              })
            }
          >
            <option value="ALL">All levels</option>
            {CEFR_LEVELS.map((level) => (
              <option key={level} value={level}>
                {formatCEFRLevel(level)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-text-muted">Topic</span>
          <select
            className="input"
            value={filters.topic}
            onChange={(event) =>
              onChange({
                ...filters,
                topic: event.target.value as PracticeTopicFilter,
              })
            }
          >
            <option value="ALL">All topics</option>
            {TOPIC_TYPES.map((topic) => (
              <option key={topic} value={topic}>
                {formatTopicType(topic)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-text-muted">Trap Type</span>
          <select
            className="input"
            value={filters.trapType}
            onChange={(event) =>
              onChange({
                ...filters,
                trapType: event.target.value as PracticeTrapFilter,
              })
            }
          >
            <option value="ALL">All traps</option>
            {TRAP_TYPES.map((trapType) => (
              <option key={trapType.id} value={trapType.id}>
                {trapType.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
