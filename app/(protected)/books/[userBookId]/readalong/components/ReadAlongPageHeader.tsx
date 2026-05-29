// Static page header for Fluid Reading.
// This replaces the old separate green intro card so the page introduces
// saved-word support once, without repeating the same reading-momentum message.
export default function ReadAlongPageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-stone-900">
        Fluid Reading with Saved Word Support
      </h1>

      <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-600">
        Use this for a quicker, smoother reading experience while you read with
        your saved words as light support. New lookups can wait — this page is
        for keeping your reading momentum.
      </p>
    </header>
  );
}