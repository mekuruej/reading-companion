export default function MekuruHomepagePreview() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#2f2a24]">
      <header className="sticky top-0 z-50 border-b border-[#d9d1c3] bg-[#f8f5ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-semibold tracking-wide">MEKURU</div>
            <div className="text-sm text-[#6b6257]">Japanese Reading & Literacy</div>
          </div>

          <nav className="hidden gap-6 text-sm md:flex">
            <a href="#home" className="hover:opacity-70">Home</a>
            <a href="#lessons" className="hover:opacity-70">Private Lessons</a>
            <a href="#groups" className="hover:opacity-70">Reading Groups</a>
            <a href="#about" className="hover:opacity-70">About</a>
            <a href="#contact" className="hover:opacity-70">Contact</a>
          </nav>

          <div className="hidden gap-3 md:flex">
            <button aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b6ab99] text-sm hover:bg-[#efe8dc]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f2a24] text-[11px] font-semibold text-white">f</span>
            </button>
            <button className="rounded-full border border-[#b6ab99] px-4 py-2 text-sm hover:bg-[#efe8dc]">
              Reading Groups
            </button>
            <button className="rounded-full bg-[#2f2a24] px-4 py-2 text-sm text-white hover:opacity-90">
              Book a Lesson
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_0.8fr] md:py-28">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Guided reading for Japanese learners</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              Reading Japanese doesn’t have to feel impossible.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#4f473d]">
              If kanji feels overwhelming, you’re not alone. Through guided reading and discussion, I help learners make sense of real texts and build confidence step by step.
            </p>
            <p className="text-xl font-medium">ページをめくって、話しまくろう！</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button className="rounded-full bg-[#2f2a24] px-5 py-3 text-sm text-white hover:opacity-90">
                Book a Lesson
              </button>
              <button className="rounded-full border border-[#b6ab99] px-5 py-3 text-sm hover:bg-[#efe8dc]">
                Reading Groups
              </button>
              <button aria-label="Facebook" className="flex h-12 w-12 items-center justify-center rounded-full border border-[#b6ab99] text-sm hover:bg-[#efe8dc]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f2a24] text-[11px] font-semibold text-white">f</span>
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d9d1c3] bg-white/70 p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#8a7f71]">Main focus</p>
                <p className="mt-2 text-lg font-medium">Private lessons for learners who want to read more deeply</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#8a7f71]">Community Learning</p>
                <p className="mt-2 text-lg font-medium">Reading groups, shared study sessions, and future reading retreats</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#8a7f71]">Free space</p>
                <p className="mt-2 text-lg font-medium">A Facebook group for learners who want to stay connected and hear about what is growing</p>
              </div>
              <div className="rounded-2xl bg-[#efe8dc] p-4">
                <p className="text-sm text-[#6b6257]">A calm, bookish space for learners who are serious about reading, even when progress feels slow.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#d9d1c3] bg-[#f3ede2]">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl font-semibold md:text-4xl">Reading Japanese takes real effort.</h2>
            <div className="mt-6 max-w-3xl space-y-5 text-lg leading-8 text-[#4f473d]">
              <p>There’s no shortcut around it.</p>
              <p>
                At some point, you have to sit with the text, work through what you don’t understand, and keep going, even when it’s slow.
              </p>
              <p>
                A lot of learners can study vocabulary and grammar, but when they open a real book, the kanji feels overwhelming, there’s too much they don’t know, it’s hard to tell what matters and what doesn’t, and it’s easy to give up halfway through.
              </p>
              <p className="font-medium text-[#2f2a24]">
                Not because they’re bad at Japanese, but because they’re trying to do it alone.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Why this works</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Reading with others changes everything.</h2>
              <div className="space-y-5 text-lg leading-8 text-[#4f473d]">
                <p>
                  What helped me most wasn’t studying more. It was reading with other learners, being able to talk through what I didn’t understand in English, and realizing I wasn’t the only one struggling.
                </p>
                <p>
                  Native Japanese teachers can often tell you how to read a word or what a sentence means. But they don’t always see why something is confusing for learners, where people get stuck, or how to explain the nuance of a sentence in a way that really clicks in English.
                </p>
                <p>
                  Whether in a private lesson or with other learners around your level, reading together changes the experience.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                "You can ask the questions you’re actually thinking.",
                "You hear what other learners didn’t understand.",
                "Difficult parts start to come together.",
                "Harder sentences can become the most interesting ones.",
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-[#d9d1c3] bg-white p-5 shadow-sm">
                  <p className="text-base leading-7 text-[#4f473d]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="lessons" className="bg-white/60">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Private lessons</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Support that fits your reading style</h2>
              <p className="text-lg leading-8 text-[#4f473d]">
                Most students take lessons 2 to 4 times per month. Lessons are flexible depending on what you are comfortable with and what helps you read best.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-[#f8f5ef] p-6">
                <h3 className="text-xl font-medium">You read first</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">You read and I guide you with corrections and support as we go.</p>
              </div>
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-[#f8f5ef] p-6">
                <h3 className="text-xl font-medium">We translate together</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">We break the text down together and talk through what is happening and why.</p>
              </div>
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-[#f8f5ef] p-6">
                <h3 className="text-xl font-medium">I read first</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">I model the reading and you follow along so the text feels less intimidating.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="groups" className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Reading community</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Challenge yourself, then bring your questions</h2>
              <p className="text-lg leading-8 text-[#4f473d]">
                Reading groups are where learners prepare a small section on their own, look up unfamiliar kanji, notice what feels confusing, and come ready to discuss it together.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-medium">First group</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">
                  A beginner friendly group is opening first. For lower levels, pre reading may be as little as one page.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-white p-6 shadow-sm">
                <h3 className="text-xl font-medium">Future groups</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">
                  More levels will be added over time, with future groups for stronger readers and reading retreats later on.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-[#d9d1c3] bg-white p-6 shadow-sm md:col-span-2">
                <h3 className="text-xl font-medium">Shared study sessions</h3>
                <p className="mt-3 leading-7 text-[#4f473d]">
                  Free study sessions are open to everyone from around JLPT N3 and up. A relaxed space to review, ask questions, and reinforce what you are learning.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="border-y border-[#d9d1c3] bg-[#f3ede2]">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Who this is for</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Reading Japanese is not only for advanced learners.</h2>
            <div className="mt-6 space-y-5 text-lg leading-8 text-[#4f473d]">
              <p>
                A lot of people feel like they need to reach a high level before they can even think about reading novels, and that until then, they should stick to things like manga. But with the right kind of support, there are books that can work even at lower levels.
              </p>
              <p>
                It does take effort. You will come across things you do not understand, and progress can feel slow at first. But starting to read earlier helps you build a much stronger foundation.
              </p>
              <p>
                The goal is not to understand everything. It is to understand enough to keep going and enjoy the process.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                "Private lessons tend to work best for learners around JLPT N4 through N2, and also for learners above that who still struggle with kanji.",
                "Reading groups are open to learners from around N4 up to N1 and beyond, with different levels added over time.",
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] bg-white px-5 py-4 shadow-sm">
                  <p className="leading-7 text-[#4f473d]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-5xl px-6 py-20">
          <div className="rounded-[2rem] border border-[#d9d1c3] bg-white p-8 shadow-sm md:p-10">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-3xl font-semibold md:text-4xl">You do not have to figure this out alone.</h2>
              <p className="text-lg leading-8 text-[#4f473d]">
                Reading Japanese can feel slow and frustrating at times. But with the right kind of support, it becomes something you can work through, understand, and eventually enjoy.
              </p>
              <p className="text-lg leading-8 text-[#4f473d]">
                If this sounds like the kind of approach you have been looking for, you are welcome to join.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-full bg-[#2f2a24] px-5 py-3 text-sm text-white hover:opacity-90">
                Book a Lesson
              </button>
              <button className="rounded-full border border-[#b6ab99] px-5 py-3 text-sm hover:bg-[#efe8dc]">
                Reading Groups
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
