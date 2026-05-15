// Vocab List Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function VocabListIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Saved Vocabulary"
      title="Open a Vocab List"
      description="Choose a book to review or edit the words saved from that book."
      actionLabel="Vocab List"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/words`}
    />
  );
}