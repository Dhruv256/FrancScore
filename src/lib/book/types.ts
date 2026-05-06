import type { Json } from "@/lib/supabase/database.types";

export type BookSource = {
  id: string;
  title: string;
  file_name: string | null;
  storage_path: string | null;
  total_pages: number | null;
  is_active: boolean;
  is_internal: boolean;
};

export type BookChapter = {
  id: string;
  book_source_id: string;
  chapter_number: number | null;
  title: string;
  start_page: number | null;
  end_page: number | null;
  section_type: string | null;
  cefr_level: string | null;
  skill_focus: string[] | null;
  order_index: number | null;
  progress?: UserBookProgress | null;
  counts?: {
    notes: number;
    generatedItems: number;
    flashcards: number;
    quizItems: number;
  };
};

export type BookPage = {
  id: string;
  page_number: number;
  cleaned_text: string | null;
  raw_text: string | null;
};

export type BookNote = {
  id: string;
  note_type: string;
  title: string;
  content_md: string;
  key_points: Json | null;
  examples: Json | null;
};

export type BookGeneratedItem = {
  id: string;
  item_type: string;
  item_json: Json;
  difficulty: string | null;
  cefr_level: string | null;
  tags: string[] | null;
};

export type UserBookProgress = {
  id: string;
  chapter_id: string;
  status: string;
  completion_percent: number;
  pages_read: number | null;
  notes_completed: boolean;
  flashcards_reviewed: number;
  quiz_score: number | null;
  last_page_read: number | null;
  last_studied_at: string | null;
};

export type BookOverview = {
  source: BookSource | null;
  chapters: BookChapter[];
  stats: {
    chaptersTotal: number;
    chaptersCompleted: number;
    pagesTotal: number;
    notesGenerated: number;
    generatedItems: number;
    flashcards: number;
    quizItems: number;
  };
};

export type BookChapterStudy = {
  source: BookSource;
  chapter: BookChapter;
  pages: BookPage[];
  notes: BookNote[];
  generatedItems: BookGeneratedItem[];
};

export type BookSearchResult = {
  id: string;
  chapter_id: string | null;
  chapter_title: string | null;
  page_start: number | null;
  page_end: number | null;
  snippet: string;
};
