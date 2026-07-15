// Empty reader state for pages or sections without Follow-Along-ready words.
// page.tsx still decides when the current page has no support words.
export default function ReadAlongEmptyState() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="text-2xl font-semibold text-stone-700">
        No Follow-Along-ready words yet
      </div>

      <p className="mt-3 text-sm text-stone-500">
        Add meanings to your saved words to use them here.
      </p>
    </div>
  );
}
