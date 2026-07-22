// Just Listening Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function JustListeningIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Listening Timer"
      title="Just listen"
      description="Choose a book to track a simple listening session."
      actionLabel="Listening Timer"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}/listening`}
    />
  );
}
