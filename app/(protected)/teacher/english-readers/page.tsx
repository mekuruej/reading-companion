// English Readers Prep Hub

import EnglishReadersActionGrid from "./components/EnglishReadersActionGrid";
import EnglishReadersHeader from "./components/EnglishReadersHeader";
import EnglishReadersIntroCard from "./components/EnglishReadersIntroCard";
import EnglishReadersMvpSteps from "./components/EnglishReadersMvpSteps";
import EnglishReadersNotesPanel from "./components/EnglishReadersNotesPanel";

const englishReaderActions = [
  {
    title: "Add English Book",
    eyebrow: "Books",
    description: "Create a manual English book record for teacher-prepared reader support.",
    status: "Coming soon" as const,
  },
  {
    title: "Manage English Reader Books",
    eyebrow: "Library",
    description: "Review teacher-prepared English reader books and their support status.",
    status: "Coming soon" as const,
  },
  {
    title: "Create Japanese Support Items",
    eyebrow: "Support",
    description: "Draft Japanese explanations, notes, vocabulary support, and reading help.",
    status: "Coming soon" as const,
  },
  {
    title: "Preview Student Reading Support",
    eyebrow: "Preview",
    description: "Check what a learner will see before any support is shared.",
    status: "Coming soon" as const,
  },
  {
    title: "Book Flashcards",
    eyebrow: "Study",
    description: "Turn approved support items into review cards for English reader work.",
    status: "Later" as const,
  },
  {
    title: "Draft Translation Helper",
    eyebrow: "Draft",
    description: "Prepare draft-only translation help for teacher review before student use.",
    status: "Later" as const,
  },
];

const mvpSteps = [
  "Manual English book",
  "Teacher-created Japanese support",
  "Student Reading Back",
  "Book flashcards",
];

const safetyNotes = [
  "English side is teacher-created first.",
  "No student-facing automatic dictionary yet.",
  "No machine translation yet.",
  "No global language-pair toggle.",
  "Do not copy Kids A-Z text, PDFs, or content into Mekuru.",
  "Translation helper may later be draft-only and teacher-reviewed before students see it.",
];

export default function EnglishReadersPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <EnglishReadersHeader />

      <div className="mt-8 space-y-8">
        <EnglishReadersIntroCard />

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black text-stone-900">Prep areas</h2>
            <p className="mt-1 text-sm text-stone-500">
              These are placeholders for the first English Readers workflow.
            </p>
          </div>

          <EnglishReadersActionGrid actions={englishReaderActions} />
        </section>

        <EnglishReadersMvpSteps steps={mvpSteps} />

        <EnglishReadersNotesPanel notes={safetyNotes} />
      </div>
    </main>
  );
}
