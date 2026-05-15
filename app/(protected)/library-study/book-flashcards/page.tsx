// Book Flashcards Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function BookFlashcardsIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Book Flashcards"
      title="Choose a book for flashcards"
      description="Choose a book to review saved vocabulary from that specific book."
      actionLabel="Book Flashcards"
      accent="stone"
      backHref="/library-study"
      backLabel="Back to Study Hub"
      hrefForBook={(userBookId) => `/books/${userBookId}/study`}
    />
  );
}