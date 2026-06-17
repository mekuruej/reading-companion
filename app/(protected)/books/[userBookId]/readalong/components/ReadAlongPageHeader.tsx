// Static page header for Fluid Reading.
// This replaces the old separate green intro card so the page introduces
// saved-word support once, without repeating the same reading-momentum message.
export default function ReadAlongPageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-stone-900">
        Fluid Reading with Saved Word Support
      </h1>

      <div className="mt-1 max-w-4xl space-y-1 text-sm leading-6 text-stone-600">
        <p>These are words you saved from this book.</p>
        <p>Read your own book, then tap each word here when it appears on the page.</p>
        <p>Each tap moves you through your saved word list.</p>
      </div>
    </header>
  );
}