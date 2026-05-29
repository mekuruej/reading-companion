// Empty reader state for pages or sections without saved words.
// page.tsx still decides when the current page has no support words.
export default function ReadAlongEmptyState() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <div className="text-2xl font-semibold text-stone-700">
        No saved words here.
      </div>

      <p className="mt-3 text-sm text-stone-500">Enjoy the story!</p>
    </div>
  );
}