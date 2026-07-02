// Just Listening Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function JustListeningIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Listening"
      title="Just listen"
      description="Choose a book to track listening time or ear-training."
      actionLabel="Listening"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/listening`}
    />
  );
}