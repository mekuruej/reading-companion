// Book Hubs Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function BookHubsIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Book Hubs"
      title="Open a Book Hub"
      description="Choose a book to open its reading hub for tracking, timers, stats, vocabulary, and available study tools."
      actionLabel="Book Hub"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}`}
    />
  );
}
