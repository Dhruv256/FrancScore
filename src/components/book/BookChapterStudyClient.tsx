"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Headphones,
  Layers,
  MessageCircle,
  NotebookTabs,
  PenTool,
} from "lucide-react";
import type { BookChapterStudy, BookGeneratedItem, BookNote, BookPage } from "@/lib/book/types";

type TabKey = "read" | "notes" | "practice" | "flashcards" | "quiz" | "ask";

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "read", label: "Read", icon: BookOpen },
  { key: "notes", label: "Notes", icon: NotebookTabs },
  { key: "practice", label: "Practice", icon: PenTool },
  { key: "flashcards", label: "Flashcards", icon: Layers },
  { key: "quiz", label: "Quiz", icon: Brain },
  { key: "ask", label: "Ask AI", icon: MessageCircle },
];

export function BookChapterStudyClient({
  study,
  initialTab = "read",
}: {
  study: BookChapterStudy;
  initialTab?: TabKey;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [pageIndex, setPageIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const flashcards = useMemo(
    () => study.generatedItems.filter((item) => item.item_type === "flashcard"),
    [study.generatedItems],
  );
  const practiceItems = useMemo(
    () =>
      study.generatedItems.filter((item) =>
        ["mcq", "fill_blank", "translation_drill", "grammar_drill"].includes(item.item_type),
      ),
    [study.generatedItems],
  );
  const quizItems = useMemo(
    () => study.generatedItems.filter((item) => item.item_type === "mcq").slice(0, 12),
    [study.generatedItems],
  );

  return (
    <div className="space-y-6">
      <div className="surface-editorial rounded-[2.5rem] border border-black/[0.06] p-5 shadow-[0_24px_80px_rgba(17,17,17,0.08)] sm:p-7">
        <Link href="/book/chapters" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-text-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to chapters
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-kicker">
              French All-in-One Book · {study.chapter.cefr_level ?? "B1"}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight text-text-primary sm:text-5xl">
              {study.chapter.title}
            </h1>
            <p className="mt-3 text-sm text-text-secondary">
              Pages {study.chapter.start_page ?? "?"}-{study.chapter.end_page ?? "?"} · {study.notes.length} notes · {study.generatedItems.length} generated study items
            </p>
          </div>
          <div className="rounded-[2rem] bg-[#111111] p-4 text-[#F7F2E8] shadow-[0_24px_70px_rgba(17,17,17,0.24)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[#A8A096]">Completion</div>
            <div className="mt-1 text-4xl font-black">{study.chapter.progress?.completion_percent ?? 0}%</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-[2rem] bg-[#111111] p-2 shadow-[0_18px_60px_rgba(17,17,17,0.18)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-w-max items-center gap-2 rounded-[1.35rem] px-4 py-3 text-sm font-black transition ${
                selected ? "bg-brand-green text-[#111111]" : "text-[#F7F2E8]/70 hover:bg-white/10 hover:text-[#F7F2E8]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "read" && (
        <ReadPanel
          pages={study.pages}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
        />
      )}
      {activeTab === "notes" && <NotesPanel notes={study.notes} />}
      {activeTab === "practice" && (
        <PracticePanel
          items={practiceItems}
          index={practiceIndex}
          setIndex={setPracticeIndex}
        />
      )}
      {activeTab === "flashcards" && (
        <FlashcardPanel
          flashcards={flashcards}
          cardIndex={cardIndex}
          setCardIndex={setCardIndex}
          showBack={showBack}
          setShowBack={setShowBack}
        />
      )}
      {activeTab === "quiz" && <QuizPanel items={quizItems} />}
      {activeTab === "ask" && <AskPanel />}
    </div>
  );
}

function ReadPanel({
  pages,
  pageIndex,
  setPageIndex,
}: {
  pages: BookPage[];
  pageIndex: number;
  setPageIndex: (index: number) => void;
}) {
  const page = pages[pageIndex];
  if (!page) {
    return <EmptyPanel title="No pages imported for this chapter." action="This chapter will be re-imported after the book module is rebuilt." />;
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <article className="rounded-[2.25rem] border border-black/[0.07] bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(17,17,17,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="page-kicker">Page {page.page_number}</p>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-black/[0.06] px-3 py-2 text-xs font-black disabled:opacity-40"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
            >
              Previous
            </button>
            <button
              className="rounded-full bg-brand-green px-3 py-2 text-xs font-black text-[#111111] disabled:opacity-40"
              disabled={pageIndex >= pages.length - 1}
              onClick={() => setPageIndex(Math.min(pages.length - 1, pageIndex + 1))}
            >
              Next
            </button>
          </div>
        </div>
        <div className="max-h-[68vh] overflow-y-auto whitespace-pre-wrap rounded-[1.5rem] bg-white/70 p-5 text-sm leading-7 text-[#27241F]">
          {page.cleaned_text ?? page.raw_text ?? "No extracted text for this page."}
        </div>
      </article>
      <aside className="rounded-[2rem] bg-[#111111] p-5 text-[#F7F2E8] shadow-[0_22px_70px_rgba(17,17,17,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-green">Study move</p>
        <h3 className="mt-3 text-xl font-black">Read actively</h3>
        <p className="mt-3 text-sm leading-6 text-[#A8A096]">
          Read one page, write one example, then jump to practice. This keeps the PDF private while making it usable as a course.
        </p>
      </aside>
    </section>
  );
}

function NotesPanel({ notes }: { notes: BookNote[] }) {
  if (!notes.length) {
    return <EmptyPanel title="Learning material not generated yet." action="Notes will return after the book module is rebuilt." />;
  }

  return (
    <div className="grid gap-4">
      {notes.map((note) => (
        <article key={note.id} className="rounded-[2rem] border border-black/[0.07] bg-[#fffaf0]/90 p-6 shadow-[0_18px_55px_rgba(17,17,17,0.07)]">
          <p className="page-kicker">{note.note_type.replace(/_/g, " ")}</p>
          <h2 className="mt-2 text-2xl font-black text-text-primary">{note.title}</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
            {note.content_md}
          </div>
        </article>
      ))}
    </div>
  );
}

function PracticePanel({
  items,
  index,
  setIndex,
}: {
  items: BookGeneratedItem[];
  index: number;
  setIndex: (index: number) => void;
}) {
  const item = items[index];
  if (!item) {
    return <EmptyPanel title="No practice generated for this chapter yet." action="Practice will return after the book module is rebuilt." />;
  }
  const json = getJsonObject(item.item_json);

  return (
    <article className="rounded-[2.25rem] bg-[#111111] p-6 text-[#F7F2E8] shadow-[0_24px_80px_rgba(17,17,17,0.25)]">
      <p className="page-kicker text-brand-green">{item.item_type.replace(/_/g, " ")}</p>
      <h2 className="mt-3 text-2xl font-black">{String(json.question ?? json.prompt ?? "Practice item")}</h2>
      {Array.isArray(json.options) && (
        <div className="mt-5 grid gap-3">
          {json.options.map((option, optionIndex) => (
            <div key={`${item.id}-${optionIndex}`} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm">
              {String(option)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 rounded-2xl bg-brand-green/15 p-4 text-sm text-[#F7F2E8]">
        <strong className="text-brand-green">Answer:</strong>{" "}
        {String(json.correct_option ?? json.answer ?? json.expected_answer ?? "Check generated notes.")}
      </div>
      <div className="mt-5 flex justify-between">
        <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-black" onClick={() => setIndex(Math.max(0, index - 1))}>
          Previous
        </button>
        <button className="rounded-full bg-brand-green px-4 py-2 text-sm font-black text-[#111111]" onClick={() => setIndex(Math.min(items.length - 1, index + 1))}>
          Next
        </button>
      </div>
    </article>
  );
}

function FlashcardPanel({
  flashcards,
  cardIndex,
  setCardIndex,
  showBack,
  setShowBack,
}: {
  flashcards: BookGeneratedItem[];
  cardIndex: number;
  setCardIndex: (index: number) => void;
  showBack: boolean;
  setShowBack: (show: boolean) => void;
}) {
  const card = flashcards[cardIndex];
  if (!card) {
    return <EmptyPanel title="No chapter flashcards generated yet." action="Flashcards will return after the book module is rebuilt." />;
  }
  const json = getJsonObject(card.item_json);
  const back = getJsonObject(json.back);

  return (
    <section className="mx-auto max-w-2xl">
      <button
        onClick={() => setShowBack(!showBack)}
        className="min-h-[360px] w-full rounded-[2.5rem] bg-[#111111] p-8 text-left text-[#F7F2E8] shadow-[0_30px_90px_rgba(17,17,17,0.25)]"
      >
        <p className="page-kicker text-brand-green">Book flashcard {cardIndex + 1}/{flashcards.length}</p>
        {!showBack ? (
          <div className="mt-16 text-center text-5xl font-black">{String(json.front ?? "Card")}</div>
        ) : (
          <div className="mt-8 space-y-4">
            <h3 className="text-2xl font-black">{String(back.english_meaning ?? "Meaning from chapter context")}</h3>
            <p className="text-lg text-[#F7F2E8]">{String(back.french_example ?? "")}</p>
            <p className="text-sm text-[#A8A096]">{String(back.english_translation ?? "")}</p>
          </div>
        )}
      </button>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {["Again", "Hard", "Good", "Easy"].map((rating) => (
          <button
            key={rating}
            className="rounded-full bg-brand-green px-3 py-3 text-xs font-black text-[#111111]"
            onClick={() => {
              setShowBack(false);
              setCardIndex(Math.min(flashcards.length - 1, cardIndex + 1));
            }}
          >
            {rating}
          </button>
        ))}
      </div>
    </section>
  );
}

function QuizPanel({ items }: { items: BookGeneratedItem[] }) {
  if (!items.length) {
    return <EmptyPanel title="No quiz generated yet." action="Quizzes will return after the book module is rebuilt." />;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const json = getJsonObject(item.item_json);
        return (
          <article key={item.id} className="rounded-[2rem] border border-black/[0.07] bg-[#fffaf0] p-5">
            <p className="text-xs font-black text-brand-green">Question {index + 1}</p>
            <h3 className="mt-2 font-black text-text-primary">{String(json.question ?? "Question")}</h3>
            <p className="mt-3 text-sm text-text-secondary">
              Correct answer: {String(json.correct_option ?? "A")} · {String(json.explanation ?? "Review the notes.")}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function AskPanel() {
  return (
    <div className="rounded-[2.25rem] border border-black/[0.07] bg-[#fffaf0] p-6 shadow-[0_18px_55px_rgba(17,17,17,0.07)]">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111111] text-brand-green">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <p className="page-kicker">Chapter-scoped AI</p>
          <h2 className="text-2xl font-black">Ask AI is ready for the RAG endpoint.</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-secondary">
        V1 stores searchable chunks and generated notes. The next endpoint should retrieve only this chapter’s chunks, then answer “based on this chapter” without exposing a raw PDF dump.
      </p>
    </div>
  );
}

function EmptyPanel({ title, action }: { title: string; action: string }) {
  return (
    <div className="rounded-[2.25rem] border border-black/[0.07] bg-[#fffaf0] p-8 text-center shadow-[0_18px_55px_rgba(17,17,17,0.07)]">
      <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-brand-green" />
      <h2 className="text-2xl font-black text-text-primary">{title}</h2>
      <p className="mt-2 text-sm text-text-secondary">{action}</p>
    </div>
  );
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
