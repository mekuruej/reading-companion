// Vocab List Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function VocabListIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Vocabulary Lists"
      title="Open a Vocabulary List"
      description="Choose a book to view its saved words and export CSV. Editing tools are included with Japanese Learning 🔒."
      actionLabel="Vocabulary List"
      emptyText="No saved words yet."
      accent="stone"
      requireSavedWords
      hrefForBook={(userBookId) => `/books/${userBookId}/words`}
    />
  );
}
