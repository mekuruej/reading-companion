// Book Hubs Index
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function BookHubsIndexPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Book Hubs"
      title="Open a Book Hub"
      description="Choose a book to open its main hub for reading, vocabulary, study, and reflection tools."
      actionLabel="Book Hub"
      accent="stone"
      hrefForBook={(userBookId) => `/books/${userBookId}`}
    />
  );
}