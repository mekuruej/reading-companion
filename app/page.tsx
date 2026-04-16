export default function MekuruLandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#2f2a24]">

      {/* HEADER */}
      <header className="border-b border-[#d9d1c3] bg-[#f8f5ef]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-semibold tracking-wide">MEKURU</div>
            <div className="text-sm text-[#6b6257]">Japanese Reading & Literacy</div>
          </div>

          <button className="rounded-full bg-[#2f2a24] px-4 py-2 text-sm text-white hover:opacity-90">
            Book a Trial Lesson
          </button>
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-16">
          <img
            src="/mekuru-banner.png"
            alt="MEKURU banner"
            className="mb-6 w-full max-w-2xl rounded-xl object-cover mx-auto"
          />
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
              Reading Japanese doesn’t have to feel impossible.
            </h1>

            <p className="text-lg leading-8 text-[#4f473d]">
              If kanji feels overwhelming, you’re not alone.
              I help learners work through real texts, understand what’s happening, and build confidence step by step.
            </p>

            <p className="text-xl font-medium">
              ページをめくって、話しまくろう！
            </p>

            <button className="mt-2 rounded-full bg-[#2f2a24] px-6 py-3 text-sm text-white hover:opacity-90">
              Book a Trial Lesson
            </button>
          </div>
        </section>

        {/* REALITY / PROBLEM */}
        <section className="border-y border-[#d9d1c3] bg-[#f3ede2]">
          <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Reading Japanese takes real effort.
            </h2>

            <p className="text-base leading-7 text-[#4f473d]">
              There’s no shortcut around it.
            </p>

            <p className="text-base leading-7 text-[#4f473d]">
              You can study vocabulary and grammar, but when you open a real book,
              it suddenly feels like too much — too many kanji, too many unknowns,
              and it’s hard to tell what actually matters.
            </p>

            <p className="text-lg font-medium text-[#2f2a24]">
              Not because you’re bad at Japanese, but because you’re trying to do it alone.
            </p>
          </div>
        </section>

        {/* YOUR INSIGHT (BEGINNER + KANJI TRUTH) */}
        <section className="mx-auto max-w-5xl px-6 py-16 space-y-12">

          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">If you're just starting</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              It might feel like you need to “learn the grammar first.”
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              But you don’t really understand grammar until you start seeing it inside real sentences.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              Even things you think you understand start to break down when you read.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              And that’s where real learning begins.
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">If you hate kanji</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              You’re not doing anything wrong.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              A lot of learners think: “Once I finish learning kanji, I’ll be able to read.”
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              But kanji isn’t something you finish. It’s something you keep encountering over time.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              Reading is what makes it start to feel real.
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">The goal isn’t to understand everything</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              It’s to understand enough to keep going.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              Reading shows you both what you don’t know and what you already understand.
            </p>
          </div>

        </section>

        {/* WHY THIS WORKS */}
        <section className="bg-white/60">
          <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-10">

            <div className="space-y-5">
              <h2 className="text-3xl font-semibold">
                Reading with others changes everything.
              </h2>

              <p className="text-lg leading-8 text-[#4f473d]">
                You can ask real questions, hear what others struggled with,
                and work through difficult parts together.
              </p>

              <p className="text-lg leading-8 text-[#4f473d]">
                Instead of just being told answers, you start to understand why something is confusing — and how it works.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Ask the questions you're actually thinking",
                "Hear what other learners struggled with",
                "Work through difficult sentences together",
                "Build real understanding, not just memorization",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[#d9d1c3] bg-white p-5">
                  <p>{item}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* LESSONS */}
        <section className="mx-auto max-w-5xl px-16 space-y-6">

          <h2 className="text-3xl font-semibold">Private Lessons</h2>

          <p className="text-lg leading-8 text-[#4f473d]">
            We work through real Japanese texts together, focusing on understanding rather than rushing through material.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            Most students are around JLPT N4 to N2.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            If you’re below that and curious about starting to read, or above that but still feel uncomfortable with kanji or longer texts, this approach can still work well.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            Some students also join small study sessions focused on grammar and JLPT-style reading, where we work through patterns and questions together.
          </p>

          <button className="mt-4 rounded-full bg-[#2f2a24] px-6 py-3 text-sm text-white hover:opacity-90">
            Book a Trial Lesson
          </button>

        </section>

        {/* FACEBOOK */}
        <section className="border-y border-[#d9d1c3] bg-[#f3ede2]">
          <div className="mx-auto max-w-5xl px-6 py-16 space-y-4">

            <h2 className="text-2xl font-semibold">Stay connected</h2>

            <p className="text-lg leading-8 text-[#4f473d]">
              There’s also a free Facebook group where learners share progress, ask questions,
              and follow what’s growing.
            </p>

            <button className="rounded-full border border-[#b6ab99] px-5 py-3 text-sm hover:bg-[#efe8dc]">
              Join the Facebook Group
            </button>

          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-[#d9d1c3] bg-white p-10 text-center space-y-4">

            <h2 className="text-3xl font-semibold">
              You don’t have to figure this out alone.
            </h2>

            <p className="text-lg text-[#4f473d]">
              If this approach feels right, you’re welcome to join.
            </p>

            <button className="rounded-full bg-[#2f2a24] px-6 py-3 text-sm text-white hover:opacity-90">
              Book a Trial Lesson
            </button>

          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs text-[#8a7f71] pb-6">
        If this helps your reading, you can support development ☕
      </footer>

    </div>
  );
}