"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileCheck,
  Headphones,
  Mic,
  PenTool,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { ExamType, SkillType } from "@/lib/types";
import type {
  MockCompletionResult,
  MockSelectableTest,
  MockSessionPayload,
} from "@/lib/mocks/types";
import { formatCEFRLevel, formatExamType, formatSkillType } from "@/lib/utils";

const skillIcons: Record<SkillType, React.ComponentType<{ className?: string }>> = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenTool,
  SPEAKING: Mic,
  VOCABULARY: BookOpen,
};

type Props = {
  tests: MockSelectableTest[];
};

type SectionKey = "selection" | "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "RESULTS";

export function MockTestSimulatorClient({ tests }: Props) {
  const [selectedExam, setSelectedExam] = useState<ExamType | "ALL">("ALL");
  const [session, setSession] = useState<MockSessionPayload | null>(null);
  const [currentSection, setCurrentSection] = useState<SectionKey>("selection");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [writingResponse, setWritingResponse] = useState("");
  const [speakingTranscript, setSpeakingTranscript] = useState("");
  const [result, setResult] = useState<MockCompletionResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"overview" | "mistakes">("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTests = useMemo(
    () => tests.filter((test) => selectedExam === "ALL" || test.examType === selectedExam),
    [selectedExam, tests],
  );

  const currentMcq =
    currentSection === "LISTENING"
      ? session?.listening[currentIndex]
      : currentSection === "READING"
      ? session?.reading[currentIndex]
      : null;

  async function handleStart(mockTestId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/mocks/session?mockTestId=${mockTestId}`);
      const payload = (await response.json()) as MockSessionPayload | { error?: string };
      if (!response.ok || !("test" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Unable to start mock.");
      }
      setSession(payload);
      setAnswers({});
      setWritingResponse("");
      setSpeakingTranscript("");
      setCurrentIndex(0);
      setCurrentSection(
        payload.listening.length
          ? "LISTENING"
          : payload.reading.length
          ? "READING"
          : payload.writingPrompt
          ? "WRITING"
          : payload.speakingPrompt
          ? "SPEAKING"
          : "RESULTS",
      );
      setResult(null);
      setActiveResultTab("overview");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start mock.");
    } finally {
      setIsLoading(false);
    }
  }

  function nextSection() {
    if (!session) return;
    if (currentSection === "LISTENING") {
      if (currentIndex < session.listening.length - 1) {
        setCurrentIndex((value) => value + 1);
        return;
      }
      setCurrentSection(session.reading.length ? "READING" : session.writingPrompt ? "WRITING" : session.speakingPrompt ? "SPEAKING" : "RESULTS");
      setCurrentIndex(0);
      return;
    }
    if (currentSection === "READING") {
      if (currentIndex < session.reading.length - 1) {
        setCurrentIndex((value) => value + 1);
        return;
      }
      setCurrentSection(session.writingPrompt ? "WRITING" : session.speakingPrompt ? "SPEAKING" : "RESULTS");
      setCurrentIndex(0);
      return;
    }
    if (currentSection === "WRITING") {
      setCurrentSection(session.speakingPrompt ? "SPEAKING" : "RESULTS");
      return;
    }
    if (currentSection === "SPEAKING") {
      void handleComplete();
    }
  }

  async function handleComplete() {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mocks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockTestId: session.test.id,
          answers,
          writingResponse,
          speakingTranscript,
        }),
      });
      const payload = (await response.json()) as MockCompletionResult | { error?: string };
      if (!response.ok || !("overallScore" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Unable to complete mock.");
      }
      setResult(payload);
      setCurrentSection("RESULTS");
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : "Unable to complete mock test.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetToSelection() {
    setSession(null);
    setResult(null);
    setCurrentSection("selection");
    setCurrentIndex(0);
    setAnswers({});
    setWritingResponse("");
    setSpeakingTranscript("");
    setError(null);
  }

  if (currentSection === "selection" || !session) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
              <FileCheck className="w-6 h-6 text-accent-emerald" />
              Mock Test Simulator
            </h1>
            <p className="text-sm text-text-secondary">
              Take compact TEF, TCF, or Mixed mock exams using live content.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedExam("ALL")}
              className={`btn btn-sm ${selectedExam === "ALL" ? "btn-primary" : "btn-secondary"}`}
            >
              All
            </button>
            {(["TEF_CANADA", "TCF_CANADA", "MIXED"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedExam(type)}
                className={`btn btn-sm ${selectedExam === type ? "btn-primary" : "btn-secondary"}`}
              >
                {formatExamType(type)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="card p-4 border border-accent-rose/30 bg-accent-rose/10 text-xs text-accent-rose">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTests.map((test) => (
            <div key={test.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{test.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge badge-green">{formatExamType(test.examType)}</span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {test.totalDuration} min
                    </span>
                  </div>
                </div>
                {test.isCompleted ? (
                  <span className="badge badge-green">
                    <Check className="w-3 h-3" />
                    Completed
                  </span>
                ) : null}
              </div>

              {test.description ? (
                <p className="text-sm text-text-secondary mb-4">{test.description}</p>
              ) : null}

              <div className="grid grid-cols-2 gap-2 mb-4">
                {test.sections.map((section) => {
                  const Icon = skillIcons[section.skill];
                  return (
                    <div key={section.id} className="p-3 rounded-lg bg-bg-input flex items-center gap-2">
                      <Icon className="w-4 h-4 text-text-muted" />
                      <div>
                        <div className="text-xs font-medium">{formatSkillType(section.skill)}</div>
                        <div className="text-[10px] text-text-muted">
                          {section.questionCount} items · {section.durationMinutes}m
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => void handleStart(test.id)}
                className="btn btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Start Mock Test"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {!filteredTests.length ? (
          <div className="card p-8 text-center text-sm text-text-muted">
            No published mock tests yet. Create one in the admin CMS to start the simulator.
          </div>
        ) : null}
      </div>
    );
  }

  if (currentSection === "RESULTS" && result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetToSelection} className="btn btn-ghost btn-sm">
            <RotateCcw className="w-4 h-4" />
            Back to Tests
          </button>
          <button
            onClick={() => setActiveResultTab(activeResultTab === "overview" ? "mistakes" : "overview")}
            className="btn btn-secondary btn-sm"
          >
            {activeResultTab === "overview" ? "Review Mistakes" : "View Results"}
          </button>
        </div>

        {activeResultTab === "overview" ? (
          <>
            <div className="card p-8 text-center card-glow-green">
              <Trophy className="w-12 h-12 text-accent-amber mx-auto mb-3" />
              <h1 className="text-2xl font-bold mb-2">Mock Test Results</h1>
              <div className="text-5xl font-bold gradient-text-green mb-2">
                {result.overallScore}%
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="badge badge-green text-base px-4 py-1">
                  {formatCEFRLevel(result.cefrEstimate)}
                </span>
                {typeof result.readinessImpact === "number" ? (
                  <span className="badge badge-purple">Readiness impact {result.readinessImpact > 0 ? "+" : ""}{result.readinessImpact}</span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.skills.map((skill) => {
                const Icon = skillIcons[skill.skill];
                return (
                  <div key={skill.skill} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="w-5 h-5 text-text-secondary" />
                      <h3 className="text-sm font-semibold">{formatSkillType(skill.skill)}</h3>
                      <span className="badge badge-blue ml-auto">
                        {formatCEFRLevel(skill.cefrEstimate)}
                      </span>
                    </div>
                    <div className="text-3xl font-bold mb-3">{skill.score}%</div>
                    <div className="text-xs text-text-muted">
                      Weak areas: {skill.weakAreas.join(", ") || "None"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="text-xs text-text-muted mb-1">Weakest Skill</div>
                <div className="text-lg font-semibold">{result.weakestSkill ? formatSkillType(result.weakestSkill) : "—"}</div>
              </div>
              <div className="card p-5">
                <div className="text-xs text-text-muted mb-1">Writing Score</div>
                <div className="text-lg font-semibold">{result.writingScore}%</div>
              </div>
              <div className="card p-5">
                <div className="text-xs text-text-muted mb-1">Speaking Score</div>
                <div className="text-lg font-semibold">{result.speakingScore}%</div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold mb-3">Weak Trap Types</h2>
              <div className="flex flex-wrap gap-2">
                {result.weakTrapTypes.length ? result.weakTrapTypes.map((trap) => (
                  <span key={trap} className="badge badge-red">{trap}</span>
                )) : <span className="text-sm text-text-muted">No trap pattern stood out.</span>}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">7-Day Repair Plan</h2>
              <div className="space-y-3">
                {result.repairPlan.map((day) => (
                  <div key={day.day} className="card p-4">
                    <h3 className="text-sm font-semibold mb-2">Day {day.day}</h3>
                    <div className="space-y-2">
                      {day.tasks.map((task, index) => (
                        <div key={index} className="p-3 rounded-lg bg-bg-input">
                          <div className="text-sm font-medium">{task.title}</div>
                          <div className="text-xs text-text-muted">{task.description}</div>
                          <div className="text-[11px] text-text-muted mt-1">{task.estimatedMinutes} min · {formatSkillType(task.skill)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-rose" />
              Review Mistakes
            </h2>
            {result.reviewMistakes.length ? (
              result.reviewMistakes.map((mistake) => (
                <div key={mistake.questionId} className="card p-5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="badge badge-blue">{formatSkillType(mistake.skill)}</span>
                    {mistake.trapType ? <span className="badge badge-red">{mistake.trapType}</span> : null}
                    {mistake.topic ? <span className="badge badge-purple">{mistake.topic}</span> : null}
                  </div>
                  <div className="text-sm font-medium mb-3">{mistake.questionText}</div>
                  <div className="space-y-2">
                    {mistake.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border text-sm ${
                          index === mistake.correctAnswerIndex
                            ? "border-status-success/40 bg-status-success/10"
                            : index === mistake.selectedAnswerIndex
                            ? "border-accent-rose/40 bg-accent-rose/10"
                            : "border-border-default bg-bg-input"
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                  {mistake.explanation ? (
                    <p className="text-xs text-text-secondary mt-3 leading-relaxed">{mistake.explanation}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="card p-8 text-center text-sm text-text-muted">
                No reviewable mistakes in this mock.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.test.title}</h1>
          <p className="text-sm text-text-secondary">{formatExamType(session.test.examType)} mock flow</p>
        </div>
        <button onClick={resetToSelection} className="btn btn-ghost btn-sm">
          Exit Mock
        </button>
      </div>

      {error ? (
        <div className="card p-4 border border-accent-rose/30 bg-accent-rose/10 text-xs text-accent-rose">
          {error}
        </div>
      ) : null}

      {currentSection === "LISTENING" || currentSection === "READING" ? (
        currentMcq ? (
          <div className="space-y-4">
            {currentSection === "READING" && currentMcq.passage ? (
              <div className="card p-5">
                <h2 className="text-base font-semibold mb-2">{currentMcq.passage.title}</h2>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {currentMcq.passage.content}
                </p>
              </div>
            ) : null}

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge badge-blue">{formatSkillType(currentSection)}</span>
                <span className="text-xs text-text-muted">
                  Question {currentIndex + 1} / {(currentSection === "LISTENING" ? session.listening.length : session.reading.length)}
                </span>
              </div>
              {currentSection === "LISTENING" && currentMcq.audioUrl ? (
                <audio controls className="w-full mb-4">
                  <source src={currentMcq.audioUrl} />
                </audio>
              ) : null}
              <h3 className="text-base font-medium mb-4">{currentMcq.questionText}</h3>
              <div className="space-y-2">
                {currentMcq.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [currentMcq.id]: index,
                      }))
                    }
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      answers[currentMcq.id] === index
                        ? "border-brand-green bg-brand-green/10"
                        : "border-border-default bg-bg-input"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={nextSection} className="btn btn-primary">
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null
      ) : currentSection === "WRITING" && session.writingPrompt ? (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-green">Writing</span>
            <span className="badge badge-blue">{session.writingPrompt.cefrLevel}</span>
          </div>
          <h2 className="text-base font-semibold mb-2">{session.writingPrompt.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            {session.writingPrompt.prompt}
          </p>
          <textarea
            value={writingResponse}
            onChange={(event) => setWritingResponse(event.target.value)}
            className="w-full h-64 p-4 bg-bg-input rounded-xl border border-border-default outline-none resize-none text-sm"
            placeholder="Write your mock response here..."
          />
          <div className="flex justify-end mt-4">
            <button onClick={nextSection} className="btn btn-primary">
              Continue to Speaking
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : currentSection === "SPEAKING" && session.speakingPrompt ? (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-amber">Speaking</span>
            <span className="badge badge-blue">{session.speakingPrompt.cefrLevel}</span>
          </div>
          <h2 className="text-base font-semibold mb-2">{session.speakingPrompt.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            {session.speakingPrompt.prompt}
          </p>
          <textarea
            value={speakingTranscript}
            onChange={(event) => setSpeakingTranscript(event.target.value)}
            className="w-full h-56 p-4 bg-bg-input rounded-xl border border-border-default outline-none resize-none text-sm"
            placeholder="Type the transcript of your spoken response for V1..."
          />
          <div className="flex justify-end mt-4">
            <button onClick={() => void handleComplete()} className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Scoring Mock..." : "Finish Mock Test"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
