// Static page header for Fluid Reading.
// This replaces the old separate green intro card so the page introduces
// saved-word support once, without repeating the same reading-momentum message.
export default function ReadAlongPageHeader() {
  return (
    <header className="pt-3 sm:pt-4">
      <h1 className="text-2xl font-semibold text-stone-900">
        Fluid Reading with Saved Words
      </h1>

      <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-600">
        Tap each saved word as you encounter it in your book to advance through the list.
      </p>
    </header>
  );
}
