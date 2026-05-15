// Saved Word Reading Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function SavedWordReadingIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Saved Word Reading"
      title="Read using saved words"
      description="Choose a book to read with saved-word support nearby."
      actionLabel="Saved Word Support"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/readalong`}
    />
  );
}