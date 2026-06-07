import type { ReactNode } from "react";

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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
          Student Entrance
        </p>

        <h2 className="mt-2 text-3xl font-semibold">
          Welcome to Mekuru
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Sign in to open your reading library, saved words, study tools, and teacher
          assignments.
        </p>

        <div className="mt-5 text-left">
          {children}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          App access is for enrolled students & beta readers only.
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Would you like to try Mekuru? Join the beta waiting list{" "}
          <a
            href="https://forms.gle/5QLgohvkNvDBzTuH9"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4 hover:text-slate-900"
          >
            here
          </a>
          .
        </p>
      </div>
    </section>
  );
}