"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Layers, Library, Search, Sparkles } from "lucide-react";
import { CEFR_LEVELS, VOCAB_TOPICS } from "@/lib/constants";
import type { CEFRLevel, TopicType, VocabStatus, VocabularyWord } from "@/lib/types";
import { formatCEFRLevel, formatTopicType, formatVocabularyStatus } from "@/lib/utils";

const statusColors: Record<VocabStatus, { bg: string; text: string }> = {
  NEW: { bg: "bg-accent-blue/10", text: "text-accent-blue" },
  LEARNING: { bg: "bg-accent-amber/10", text: "text-accent-amber" },
  WEAK: { bg: "bg-accent-rose/10", text: "text-accent-rose" },
  MASTERED: { bg: "bg-status-success/10", text: "text-status-success" },
};

export function VocabularyBankClient({
  words,
  isAdmin = false,
}: {
  words: VocabularyWord[];
  isAdmin?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VocabStatus | "ALL">("ALL");
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | "ALL">("ALL");
  const [topicFilter, setTopicFilter] = useState<TopicType | "ALL">("ALL");

  const filtered = useMemo(
    () =>
      words.filter((word) => {
        if (
          searchQuery &&
          !word.frenchWord.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !word.englishMeaning.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        if (statusFilter !== "ALL" && word.status !== statusFilter) return false;
        if (levelFilter !== "ALL" && word.cefrLevel !== levelFilter) return false;
        if (topicFilter !== "ALL" && word.topicType !== topicFilter) return false;
        return true;
      }),
    [levelFilter, searchQuery, statusFilter, topicFilter, words],
  );

  const stats = useMemo(
    () => ({
      total: words.length,
      mastered: words.filter((word) => word.status === "MASTERED").length,
      learning: words.filter((word) => word.status === "LEARNING").length,
      weak: words.filter((word) => word.status === "WEAK").length,
      newCount: words.filter((word) => word.status === "NEW").length,
    }),
    [words],
  );

  const masteryPercentage = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="surface-panel rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-kicker mb-3">
              <Library className="w-4 h-4" />
              Real study inventory
            </p>
            <h1 className="text-3xl font-black text-text-primary sm:text-4xl">
              Vocabulary Bank
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {stats.total} live words · {stats.mastered} mastered · {stats.weak} weak
            </p>
          </div>
          <Link href="/vocabulary/flashcards" className="btn btn-primary">
            <Layers className="w-4 h-4" />
            Start Flashcards
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {isAdmin ? (
        <div className="rounded-[2rem] border border-[rgba(17,17,17,0.08)] bg-[#fff8ed]/80 p-5">
          <p className="text-sm font-black text-text-primary">Admin daily vocabulary</p>
          <p className="mt-1 text-xs text-text-muted">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-brand-green" />
            Generate today&apos;s 50 AI words from the dedicated Admin Vocabulary workflow.
          </p>
          <Link href="/admin/vocabulary" className="btn btn-primary btn-sm mt-4">
            Open Admin Vocabulary
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New" value={stats.newCount} valueClassName="text-accent-blue" />
        <StatCard label="Learning" value={stats.learning} valueClassName="text-accent-amber" />
        <StatCard label="Weak" value={stats.weak} valueClassName="text-accent-rose" />
        <StatCard label="Mastered" value={stats.mastered} valueClassName="text-status-success" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Vocabulary Mastery</span>
          <span className="text-sm text-brand-green font-medium">{masteryPercentage}%</span>
        </div>
        <div className="progress-bar h-3">
          <div
            className="progress-fill progress-fill-green h-3"
            style={{ width: `${masteryPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input pl-10"
            placeholder="Search words..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as VocabStatus | "ALL")}
          className="input w-auto"
        >
          <option value="ALL">All Status</option>
          <option value="NEW">New</option>
          <option value="LEARNING">Learning</option>
          <option value="WEAK">Weak</option>
          <option value="MASTERED">Mastered</option>
        </select>
        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value as CEFRLevel | "ALL")}
          className="input w-auto"
        >
          <option value="ALL">All Levels</option>
          {CEFR_LEVELS.map((level) => (
            <option key={level} value={level}>
              {formatCEFRLevel(level)}
            </option>
          ))}
        </select>
        <select
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value as TopicType | "ALL")}
          className="input w-auto"
        >
          <option value="ALL">All Topics</option>
          {VOCAB_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {formatTopicType(topic)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((word) => {
            const status = word.status ?? "NEW";
            const statusColor = statusColors[status];
            return (
              <div key={word.id} className="card group rounded-[1.75rem]">
                <div className="flex items-start justify-between mb-2 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-text-primary">{word.frenchWord}</h3>
                    <p className="text-sm text-text-secondary">{word.englishMeaning}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${statusColor.bg} ${statusColor.text} border-none`}>
                      {formatVocabularyStatus(status)}
                    </span>
                    <span className="badge badge-blue">{formatCEFRLevel(word.cefrLevel)}</span>
                  </div>
                </div>

                <div className="mb-3 rounded-[1.25rem] border border-white/8 bg-[rgba(244,238,221,0.06)] p-4">
                  <p className="text-xs italic text-text-secondary">
                    FR: {word.frenchExample ?? "Example coming soon."}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    EN: {word.englishExampleTranslation ?? "Translation coming soon."}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1">
                    {word.tags.slice(0, 3).map((tag, index) => (
                      <span key={`${word.id}-${tag}-${index}`} className="badge badge-purple text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-text-muted">{formatTopicType(word.topicType)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="surface-panel rounded-[2rem] p-8 text-center sm:p-12">
          <Library className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
          <p className="page-kicker justify-center mb-3">Live vocabulary only</p>
          <h3 className="text-xl font-black text-text-primary mb-2">
            No Supabase vocabulary matches this view.
          </h3>
          <p className="mx-auto max-w-lg text-sm leading-6 text-text-secondary">
            Adjust your filters, seed
            {" "}
            <code>supabase/seed/francscore_initial_learning_data.sql</code>
            {" "}
            or import a CSV through the new vocabulary pipeline to populate real study words.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <div className="card text-center py-3">
      <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
