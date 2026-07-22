export const GUEST_PROGRESS_KEY = "francscore_guest_flashcard_progress_v1";
export type GuestCardProgress = { status: "NEW" | "LEARNING" | "WEAK" | "MASTERED"; again: number; hard: number; good: number; easy: number; reviewCount: number; weak: boolean; mastered: boolean; lastReviewedAt?: string; nextReviewAt?: string; skipped: number };
export type GuestProgress = { cards: Record<string, GuestCardProgress>; selectedFilters: Record<string, string>; deck: string; coachDismissed: boolean; swipeEnabled: boolean };
export const emptyGuestProgress = (): GuestProgress => ({ cards: {}, selectedFilters: {}, deck: "Random 20", coachDismissed: false, swipeEnabled: true });
export function loadGuestProgress(): GuestProgress { if (typeof window === "undefined") return emptyGuestProgress(); try { return { ...emptyGuestProgress(), ...JSON.parse(localStorage.getItem(GUEST_PROGRESS_KEY) ?? "{}") }; } catch { return emptyGuestProgress(); } }
export function saveGuestProgress(value: GuestProgress) { localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(value)); }
