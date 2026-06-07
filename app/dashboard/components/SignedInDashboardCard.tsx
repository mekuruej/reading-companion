import type { ReactNode } from "react";

type SignedInDashboardCardProps = {
  onOpenLibrary: () => void;
  children?: ReactNode;
};

export default function SignedInDashboardCard({
  onOpenLibrary,
  children,
}: SignedInDashboardCardProps) {
  return (
    <section className="w-full max-w-xl">
      <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-6 text-center shadow-sm">
        <h2 className="text-3xl font-semibold">Welcome to Mekuru</h2>

        <p className="mt-3 text-gray-500">
          Every word carries the memory of where you met it.
          <br />
          ページをめくって、話しまくろう！
        </p>

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-inner">
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
              Word warm-up
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Tap a few words you can read.
            </p>
          </div>

          {children}
        </div>

        <button
          type="button"
          onClick={onOpenLibrary}
          className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
        >
          Go to My Library
        </button>
      </div>
    </section>
  );
}