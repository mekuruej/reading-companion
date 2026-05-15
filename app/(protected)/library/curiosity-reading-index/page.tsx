// Curiosity Reading Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function CuriosityReadingIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Read while looking up words"
      title="Curiosity Reading Index"
      description="Choose a book to open Curiosity Reading and save words as you read."
      actionLabel="Curiosity Reading"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/curiosity-reading`}
    />
  );
}