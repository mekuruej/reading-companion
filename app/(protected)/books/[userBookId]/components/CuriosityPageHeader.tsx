export default function CuriosityPageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">
        Curiosity Reading
      </h1>

      <p className="mt-1 hidden text-sm text-stone-600 sm:block">
        Use this for a slower, exploratory reading experience. This is where
        you stop, investigate, save new words, and let lookup time count as part
        of the reading session.
      </p>
    </div>
  );
}