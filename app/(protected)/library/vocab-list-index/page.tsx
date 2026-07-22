// Vocab List Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function VocabListIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Vocabulary Archive"
      title="Open a Vocabulary Archive"
      description="Choose a book to view saved words and export CSV. Editing tools stay with Reading Access."
      actionLabel="Vocabulary Archive"
      emptyText="No saved words yet."
      accent="stone"
      requireSavedWords
      hrefForBook={(userBookId) => `/books/${userBookId}/words`}
    />
  );
}
