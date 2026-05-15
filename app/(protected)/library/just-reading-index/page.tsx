// Just Reading Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function JustReadingIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Just Reading"
      title="Just read"
      description="Choose a book to track a simple Just Reading session."
      actionLabel="Just Reading"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/just-reading`}
    />
  );
}