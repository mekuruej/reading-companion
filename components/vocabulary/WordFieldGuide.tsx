const guidance = {
  word: "This is the form you’ll study on your book flashcards and see as your main vocabulary word.",
  captureWord: "Flashcards・Follow-Along・Vocabulary List",
  alternative: "Other spelling/kanji. Flashcards・Follow-Along・Vocabulary List",
  teacherWord: "Flashcards・Follow-Along・Vocabulary List",
  teacherAlternative: "Other spelling/kanji. Flashcards・Follow-Along・Vocabulary List",
  reading: "Flashcards・Follow-Along・Vocabulary List",
  meaning: "Flashcards・Follow-Along・Vocabulary List",
  bookForm: "Form/Tense. Replace main word in Follow-Along",
  encountered: "Keeps the text you captured. To change the spelling shown in Follow-Along, use Form in the book.",
  dictionary: "Reference form for this word. Changing it does not change your main flashcard word.",
  lookup: "Used by Jisho lookup in this review. Changing it alone does not change the saved word shown in study tools.",
} as const;

export default function WordFieldGuide({ field }: { field: keyof typeof guidance }) {
  return <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">{guidance[field]}</span>;
}
