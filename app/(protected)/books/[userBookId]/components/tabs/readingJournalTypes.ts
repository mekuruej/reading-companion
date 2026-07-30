export type StoryTabMode = "detective" | "characters" | "plot" | "setting" | "cultural" | "quotes";

export type DetectiveEntry = {
  id: string;
  user_id: string;
  user_book_id: string;
  title: string | null;
  chapter_label: string | null;
  chapter_number: number | null;
  page_number: number | null;
  certain_text: string | null;
  likely_text: string | null;
  possible_text: string | null;
  unknown_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
