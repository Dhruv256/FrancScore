/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, Layers3, Moon, RotateCcw, SkipForward, Sparkles, Sun, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { emptyGuestProgress, loadGuestProgress, saveGuestProgress, type GuestProgress } from "@/lib/guest-progress";
import { useTheme } from "@/components/theme/ThemeProvider";

type Card = { id: string; french_word: string; english_meaning: string; cefr_level: string; topic: string; broad_category: string };
type Rating = "Again" | "Hard" | "Good" | "Easy" | "Skip";
type DeckMode = "daily" | "all";
const levels = ["ALL", "A0", "A1", "A2", "B1", "B2", "C1"];
const categories = ["ALL", "People and Family", "Food and Drink", "Home", "Travel and Transport", "Work and Education", "Health and Body", "Technology", "Grammar and Connectors", "Other"];
const decks = [
  { title: "Daily Review", subtitle: "A calm 10-minute reset", count: "20 cards", icon: Zap, tone: "mint" },
  { title: "All Vocabulary", subtitle: "The complete FrancScore library", count: "4,301 cards", icon: Layers3, tone: "blue" },
  { title: "Weak Words", subtitle: "Give tricky words another pass", count: "Your saved cards", icon: Trophy, tone: "coral" },
];

export function FlashcardsOnlyClient() {
  const [cards, setCards] = useState<Card[]>([]);
  const [level, setLevel] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [started, setStarted] = useState(false);
  const [deckMode, setDeckMode] = useState<DeckMode>("daily");
  const [allOffset, setAllOffset] = useState(0);
  const [reviewDeck, setReviewDeck] = useState<Exclude<Rating, "Skip"> | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<GuestProgress>(emptyGuestProgress);
  const [notice, setNotice] = useState("Choose a deck to begin.");
  const [coach, setCoach] = useState(false);
  const [dragLabel, setDragLabel] = useState("");
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lock = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const reviewIds = reviewDeck ? Object.entries(progress.cards).filter(([, value]) => value[reviewDeck.toLowerCase() as "again" | "hard" | "good" | "easy"] > 0).map(([id]) => id) : [];
  const reviewIdsKey = reviewIds.join(",");

  useEffect(() => setProgress(loadGuestProgress()), []);
  useEffect(() => {
    setIsLoading(true);
    if (reviewDeck && reviewIds.length === 0) { setCards([]); setIndex(0); setFlipped(false); setIsLoading(false); return; }
    const query = new URLSearchParams(reviewIds.length ? { ids: reviewIdsKey, limit: String(Math.min(reviewIds.length, 50)), sort: "alpha" } : { limit: deckMode === "all" ? "50" : "20", level, category, offset: deckMode === "all" ? String(allOffset) : "0", sort: deckMode === "all" ? "alpha" : "mixed" });
    fetch(`/api/flashcards/public-deck?${query}`).then((response) => response.json()).then((payload) => { setCards(payload.cards ?? []); setIndex(0); setFlipped(false); }).catch(() => setNotice("Your deck is offline. Check Supabase, then retry.")).finally(() => setIsLoading(false));
  }, [level, category, reviewDeck, reviewIdsKey, reviewIds.length, deckMode, allOffset]);
  useEffect(() => { if (!progress.coachDismissed) setCoach(true); }, [progress.coachDismissed]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === " ") { event.preventDefault(); setFlipped((value) => !value); } if (["1", "2", "3", "4"].includes(event.key)) review((["Again", "Hard", "Good", "Easy"] as const)[Number(event.key) - 1]); if (event.key.toLowerCase() === "s") review("Skip"); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); });

  const card = cards[index];
  const reviewed = Object.keys(progress.cards).length;
  const announce = (message: string) => { setNotice(message); if (typeof navigator !== "undefined") navigator.vibrate?.(8); };
  function review(rating: Rating) {
    if (!card || lock.current) return;
    lock.current = true;
    const old = progress.cards[card.id] ?? { status: "NEW", again: 0, hard: 0, good: 0, easy: 0, reviewCount: 0, weak: false, mastered: false, skipped: 0 };
    const key = rating.toLowerCase() as "again" | "hard" | "good" | "easy";
    const next = { ...old, status: rating === "Again" ? "LEARNING" : rating === "Easy" ? "MASTERED" : rating === "Skip" ? old.status : "LEARNING", ...(rating === "Skip" ? {} : { [key]: old[key] + 1 }), reviewCount: old.reviewCount + (rating === "Skip" ? 0 : 1), skipped: old.skipped + (rating === "Skip" ? 1 : 0), mastered: rating === "Easy" ? true : old.mastered };
    const nextProgress = { ...progress, cards: { ...progress.cards, [card.id]: next } };
    setProgress(nextProgress); saveGuestProgress(nextProgress); setFlipped(false); setDrag({ x: 0, y: 0 }); if (deckMode === "all" && index >= cards.length - 1) { setAllOffset((value) => value + cards.length); setIndex(0); } else setIndex((value) => (value + 1) % Math.max(cards.length, 1)); announce(rating === "Skip" ? "Card skipped" : `Marked ${rating}`); window.setTimeout(() => { lock.current = false; }, 320);
  }
  function labelFor(x: number, y: number) { if (Math.max(Math.abs(x), Math.abs(y)) < 30) return ""; if (y > 70 && Math.abs(x) < 90) return "Skip"; if (x < -70 && y > 20) return "Hard"; if (x < -70) return "Again"; if (x > 70 && y < -45) return "Easy"; if (x > 70) return "Good"; return ""; }
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) { if (flipped) return; setIsDragging(true); event.currentTarget.setPointerCapture(event.pointerId); setDrag({ x: 0, y: 0 }); pressTimer.current = window.setTimeout(() => { if (card) { const next = { ...progress, cards: { ...progress.cards, [card.id]: { ...(progress.cards[card.id] ?? { status: "NEW", again: 0, hard: 0, good: 0, easy: 0, reviewCount: 0, weak: false, mastered: false, skipped: 0 }), weak: !(progress.cards[card.id]?.weak ?? false) } } }; setProgress(next); saveGuestProgress(next); announce(next.cards[card.id].weak ? "Marked as Weak" : "Removed from Weak Words"); } }, 550); }
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) { if (!isDragging) return; const next = { x: event.movementX + drag.x, y: event.movementY + drag.y }; setDrag(next); setDragLabel(labelFor(next.x, next.y)); }
  function onPointerUp() { if (pressTimer.current) window.clearTimeout(pressTimer.current); setIsDragging(false); const action = labelFor(drag.x, drag.y); setDragLabel(""); if (action) review(action as Rating); else setDrag({ x: 0, y: 0 }); }
  function dismissCoach() { const next = { ...progress, coachDismissed: true }; setProgress(next); saveGuestProgress(next); setCoach(false); }
  function startReviewDeck(rating: Exclude<Rating, "Skip">) { setReviewDeck(rating); setStarted(true); announce(`${rating} cards selected`); }
  function startDeck(mode: DeckMode, title: string) { setReviewDeck(null); setDeckMode(mode); setAllOffset(0); setStarted(true); announce(`${title} deck selected`); }

  return <div className="motion-enter space-y-6">
    <section className="flex items-end justify-between gap-4"><div><p className="theme-soft text-xs font-black uppercase tracking-[.18em]">FrancScore / {reviewed} reviewed</p><h1 className="page-title mt-2">Learn a little<br /><span className="editorial-title text-[var(--accent-primary)]">every day.</span></h1></div><div className="flex gap-2"><button className="icon-button" onClick={() => setCoach(true)} aria-label="View gesture guide"><Info className="h-5 w-5" /></button><button className="icon-button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle theme">{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button></div></section>
    {!started ? <>
      <section className="ui-surface overflow-hidden p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="theme-soft text-sm font-bold">A focused session, no account needed.</p><h2 className="editorial-title mt-2 max-w-md text-3xl sm:text-4xl">Your next French word is waiting.</h2></div><Sparkles className="h-6 w-6 text-[var(--accent-highlight)]" /></div><div className="mt-6 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full w-[34%] rounded-full bg-[var(--accent-primary)]" /></div><span className="theme-soft text-xs font-black">10 min</span></div></section>
      <div className="motion-stagger grid gap-4 sm:grid-cols-3">{decks.map(({ title, subtitle, count, icon: Icon, tone }) => <button key={title} onClick={() => startDeck(title === "All Vocabulary" ? "all" : "daily", title)} className={`deck-card deck-${tone} ui-card p-5 text-left`}><div className="flex items-start justify-between"><span className="deck-icon"><Icon className="h-5 w-5" /></span><span className="theme-soft text-xs font-black">{count}</span></div><h3 className="mt-10 text-xl font-black">{title}</h3><p className="theme-muted mt-2 text-sm leading-6">{subtitle}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full w-1/3 rounded-full bg-current opacity-60" /></div></button>)}</div>
      <section className="ui-surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="theme-soft text-xs font-black uppercase tracking-[.16em]">Review buckets</p><h2 className="mt-1 text-lg font-black">Revise by answer</h2><p className="theme-muted mt-1 text-sm">Return to the cards you marked in each category.</p></div><RotateCcw className="theme-soft h-5 w-5" /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{(["Again", "Hard", "Good", "Easy"] as const).map((rating) => { const count = Object.values(progress.cards).filter((value) => value[rating.toLowerCase() as "again" | "hard" | "good" | "easy"] > 0).length; return <button key={rating} className={`review-bucket review-${rating.toLowerCase()}`} onClick={() => startReviewDeck(rating)}><span>{rating}</span><strong>{count}</strong><small>cards</small></button>; })}</div></section>
      <section className="ui-surface p-5"><div className="flex items-center justify-between"><div><p className="theme-soft text-xs font-black uppercase tracking-[.16em]">Shape this session</p><h2 className="mt-1 text-lg font-black">Find your lane</h2></div><RotateCcw className="theme-soft h-5 w-5" /></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{levels.map((value) => <button key={value} className={`filter-chip ${level === value ? "is-selected" : ""}`} onClick={() => setLevel(value)}>{value === "ALL" ? "All levels" : value}</button>)}</div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.slice(0, 6).map((value) => <button key={value} className={`filter-chip ${category === value ? "is-selected" : ""}`} onClick={() => setCategory(value)}>{value === "ALL" ? "All themes" : value}</button>)}</div></section>
    </> : <>
      <div className="flex items-center justify-between gap-3"><button className="btn btn-secondary" onClick={() => { setStarted(false); setReviewDeck(null); setDeckMode("daily"); setAllOffset(0); }}>← Decks</button><p className="theme-soft text-sm font-bold">{reviewDeck ? `${reviewDeck} cards` : deckMode === "all" ? "All Vocabulary" : "Daily Review"} · {cards.length ? `${index + 1} / ${cards.length}${deckMode === "all" ? " in batch" : ""}` : "Loading"}</p><button className="btn btn-ghost" onClick={() => setCoach(true)} aria-label="View gesture guide"><Info className="h-5 w-5" /></button></div>
      <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-muted)]"><motion.div className="h-full rounded-full bg-[var(--accent-primary)]" animate={{ width: `${cards.length ? ((index + 1) / cards.length) * 100 : 0}%` }} transition={{ duration: reducedMotion ? 0 : .3 }} /></div><span className="theme-soft text-xs font-black">{cards.length ? `${index + 1} / ${cards.length}` : "—"}</span></div>
      {isLoading ? <div className="ui-surface skeleton-card min-h-[52vh]" /> : card ? <div className="flashcard-stage relative mx-auto w-full max-w-2xl"><div className="stack-card stack-one" /><div className="stack-card stack-two" /><AnimatePresence mode="wait"><motion.div key={`${card.id}-${index}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -16, scale: .97 }} transition={{ duration: reducedMotion ? .12 : .34, ease: [.22, .8, .25, 1] }}><div className={`flashcard-live ui-surface ${flipped ? "is-flipped" : ""}`} style={{ transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * .035}deg)` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={() => announce("Marked as Mastered")} onClick={() => { if (!isDragging && !dragLabel) setFlipped((value) => !value); }}><AnimatePresence mode="wait"><motion.div key={flipped ? "back" : "front"} initial={{ opacity: 0, rotateY: flipped ? -14 : 14 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: reducedMotion ? .1 : .34 }} className="flashcard-content"><div className="flex items-center justify-between"><span className="level-chip">{card.cefr_level}</span><span className="theme-soft text-xs font-black uppercase tracking-[.15em]">{flipped ? "Meaning" : "French"}</span></div>{flipped ? <div><p className="flashcard-word editorial-title">{card.english_meaning}</p><p className="theme-muted mt-8 max-w-md text-sm leading-6">{card.topic}</p><p className="mt-2 text-xs font-black uppercase tracking-[.12em] text-[var(--accent-primary)]">{card.broad_category}</p></div> : <p className="flashcard-word">{card.french_word}</p>}<div className="flex items-center justify-between"><span className="theme-soft text-xs font-bold">{dragLabel || (flipped ? "Tap for French" : "Tap to reveal")}</span><RotateCcw className="theme-soft h-5 w-5" /></div></motion.div></AnimatePresence>{dragLabel ? <div className="gesture-label">{dragLabel}</div> : null}</div></motion.div></AnimatePresence></div> : <div className="ui-surface p-10 text-center"><p className="text-xl font-black">No cards in this deck yet.</p><p className="theme-muted mt-2 text-sm">Try another filter or connect Supabase.</p></div>}
      <div className="review-row">{(["Again", "Hard", "Good", "Easy"] as const).map((rating) => <button key={rating} className={`review-button review-${rating.toLowerCase()}`} onClick={() => review(rating)}>{rating}<span>{rating === "Again" ? "1" : rating === "Hard" ? "2" : rating === "Good" ? "3" : "4"}</span></button>)}<button className="review-button" onClick={() => review("Skip")} aria-label="Skip card"><SkipForward className="mx-auto h-4 w-4" /><span>S</span></button></div><p aria-live="polite" className="theme-muted text-center text-sm font-bold">{notice}</p>
    </>}
    {coach ? <div className="modal-scrim" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setCoach(false); }}><motion.div role="dialog" aria-modal="true" aria-labelledby="gesture-guide-title" initial={{ opacity: 0, y: reducedMotion ? 0 : 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="ui-surface modal-sheet"><p className="theme-soft text-xs font-black uppercase tracking-[.18em]">Gesture guide</p><h2 id="gesture-guide-title" className="editorial-title mt-2 text-3xl">Learn by feel.</h2><p className="theme-muted mt-4 text-sm leading-7">Tap to flip · swipe left Again · down-left Hard · right Good · up-right Easy · down Skip · hold for Weak · double tap for Mastered.</p><div className="modal-actions mt-6"><button className="btn btn-primary" onClick={dismissCoach}>Got it</button><button className="btn btn-secondary" onClick={() => setCoach(false)}>Close</button></div></motion.div></div> : null}
  </div>;
}
