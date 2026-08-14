import type { ReactNode } from "react";
import Link from "next/link";

type SignedOutLoginSectionProps = {
  children: ReactNode;
};

export default function SignedOutLoginSection({
  children,
}: SignedOutLoginSectionProps) {
  return (
    <section className="grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <img
        src="/mekuru-banner.png"
        alt="MEKURU banner"
        className="w-full rounded-2xl border border-slate-200 object-cover shadow-lg shadow-slate-300/40"
      />

      <div className="rounded-3xl border border-slate-200 bg-white/85 px-6 py-6 text-center shadow-sm">
        <h2 className="text-3xl font-semibold">
          Welcome back
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Sign in to return to your library, reading history, journals, and study tools.
        </p>

        <div className="mt-5 text-left">
          {children}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
          <p>Don’t have an account?</p>
          <Link
            href="/login/beta-signup"
            className="mt-1 inline-flex font-semibold underline underline-offset-4 hover:text-slate-900"
          >
            Create a free account →
          </Link>
        </div>
      </div>
    </section>
  );
}
