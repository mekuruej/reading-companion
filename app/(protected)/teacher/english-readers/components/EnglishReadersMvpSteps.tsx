type EnglishReadersMvpStepsProps = {
  steps: string[];
};

export default function EnglishReadersMvpSteps({ steps }: EnglishReadersMvpStepsProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        MVP Flow
      </p>

      <h2 className="mt-2 text-xl font-black text-stone-900">
        First working path
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-sm font-black text-white">
              {index + 1}
            </div>

            <p className="mt-3 text-sm font-semibold leading-6 text-stone-800">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
