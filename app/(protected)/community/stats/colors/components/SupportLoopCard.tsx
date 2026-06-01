export default function SupportLoopCard() {
  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-5 text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
          Red 2
        </span>
        <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-black text-white">
          Orange 2
        </span>
        <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-black text-stone-900">
          Yellow 2
        </span>
      </div>

      <h3 className="mt-4 text-lg font-black">Extra encounter support</h3>

      <p className="mt-1 text-sm font-bold">
        Chosen before the reading gate
      </p>

      <p className="mt-4 text-sm leading-6 text-stone-700">
        If a word reaches Yellow but still feels too far above your level, you
        can send it into another encounter loop. Red 2, Orange 2, and Yellow 2
        mean Mekuru is waiting for more real reading encounters before asking
        again. The number can keep growing: Red 3, Orange 3, Yellow 3, and so
        on.
      </p>
    </div>
  );
}