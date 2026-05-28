// Static intro copy for the book-specific vocabulary list.
// This stays presentational so page.tsx can focus on loading, filtering,
// editing, and word actions.

export default function BookVocabIntroCopy() {
  return (
    <div className="mt-2 mb-4 w-full border-b border-gray-300 pb-4">
      <p className="text-sm text-gray-500 text-center">
        The words you’ve added from this book, organized in reading order to support your reading.
      </p>
      <p className="mt-1 text-sm text-stone-500 text-center">
        Use search, chapter filters, and hidden-word mode to focus the list.
      </p>
    </div>
  );
}