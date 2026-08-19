// Japanese Books Gateway
//

"use client";

import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";

export default function JapaneseBooksGatewayPage() {
  return (
    <LibraryBookActionIndex
      eyebrow="Japanese Books"
      title="Open a Japanese Book"
      description="Choose a Japanese book from your Library, then use its Book Hub to open Follow-Along, Save Words, or Review Words."
      actionLabel="Book Hub"
      emptyText="No Japanese books found in your Library yet."
      accent="violet"
      filterJapaneseBooks
      hrefForBook={(userBookId) => `/books/${userBookId}`}
    />
  );
}
