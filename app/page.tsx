import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">
      {/* HERO */}
      <section className="space-y-4 text-center">
        <img
          src="/mekuru-banner.png"
          alt="MEKURU banner"
          className="mx-auto w-full max-w-2xl rounded-xl object-cover"
        />

        <h1 className="text-3xl font-semibold md:text-5xl">
          Reading Japanese can feel impossible, but it doesn't have to.
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-7 text-[#4f473d]">
          You're not alone in finding kanji, complex sentences, or large amounts of vocabulary overwhelming.
          <br />
          I help learners work through real texts in English to help you understand what’s happening, point out grammar you may easily miss alone, and build your confidence page by page.
        </p>

        <p className="text-sm text-[#6b6257]">ページをめくって、話しまくろう！</p>
      </section>

      {/* WHY THIS EXISTS */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">
          Reading Japanese takes a lot of time and effort.
        </h2>

        <p className="text-base leading-7 text-[#4f473d]">
          Unfortunately, there’s no shortcut around that. However, reading with someone who can guide you can lighten that load.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          Even when you study vocabulary and grammar, when you open a real book, it can still feel overwhelming. There are too many kanji, too many unknowns, and it’s hard to tell what actually matters.
        </p>

        <p className="font-medium text-base leading-7 text-[#2f2a24]">
          Not only that, this can feel exponentially worse when you do it alone.
        </p>
      </section>

      {/* GUIDED READING */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Reading with someone who can guide you can change that.</h2>

        <p className="text-base leading-7 text-[#4f473d]">
          Instead of guessing your way through a sentence, with detailed English guidance you can start to see what’s actually happening.
        </p>

        <ul className="space-y-2 text-base text-[#4f473d]">
          <li>• Ask all the questions you’re actually thinking and get understandable answers from someone who went through the same troubles</li>
          <li>• Work through difficult sentences step by step</li>
          <li>• Understand why something is confusing and not just what it means</li>
          <li>• Build real understanding, not just memorization</li>
          <li>• Begin building familiarity with vocabulary, grammar, and kanji through repeated exposure, even if you don’t remember it right away</li>
        </ul>

        <div className="pt-6 text-center">
          <a
            href="https://scheduler.zoom.us/mekuru/free-trial-japanese-reading-lesson"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-2xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700"
          >
            Book a Free Trial Lesson
          </a>
        </div>
      </section>

      {/* LESSONS */}
      <section className="-mt-4 space-y-4">
        <h2 className="text-2xl font-semibold">Private Lessons</h2>

        <p className="text-base leading-7 text-[#4f473d]">
          We work through real Japanese texts together, focusing on understanding rather than rushing through material. Some students prefer to translate every sentence or paragraph together, some prefer that I read first, and some prefer to try first. Whatever works best for that student.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          My lessons focus on reading and understanding Japanese. Many students choose to combine this with conversation lessons with a native Japanese teacher, so they can build both comprehension and speaking ability.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          Most students are around JLPT N4 to N2.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          If you’re below that and curious about starting to read, or above that but still feel uncomfortable with kanji or longer texts, this approach can still work well.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          Students are also welcome to join small JLPT study sessions focused on grammar and JLPT-style reading, if it fits your schedule. These are not traditional lessons. We work through the textbook together as a group and the teacher is there to help if you get stuck. Students must have their own copy of the textbook.
        </p>

        <p className="text-base leading-7 text-[#4f473d]">
          I offer a variety of lesson plans, so there are options for different schedules and budgets.
        </p>
      </section>

      <section className="mt-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-stone-900">
              Pricing
            </h2>

            <div className="mt-4 space-y-4 text-sm text-stone-700">
              <div>
                <p className="font-medium">Term Plan — 16 Lessons</p>
                <p>16 lessons (approx. 4/month)</p>
                <p className="mt-1">¥64,000 per term</p>
                <p className="text-xs text-stone-500">Approx. ¥4,000 per lesson</p>
              </div>

              <div>
                <p className="font-medium">Flexible Plan — 12 Lessons</p>
                <p>12 lessons (approx. 3/month)</p>
                <p className="mt-1">¥54,000 per term</p>
                <p className="text-xs text-stone-500">Approx. ¥4,500 per lesson</p>
              </div>

              <div>
                <p className="font-medium">Light Plan — 8 Lessons</p>
                <p>8 lessons (approx. 2/month)</p>
                <p className="mt-1">¥36,000 per term</p>
                <p className="text-xs text-stone-500">Approx. ¥4,500 per lesson</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-500">
              Monthly and annual payment options are also available.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-3xl px-6">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h3 className="text-base font-semibold text-stone-900">
            Included with Every Lesson
          </h3>

          <p className="mt-2 text-sm text-stone-700">
            All students get access to the Mekuru Reading Companion — a private tool designed to support your reading outside of lessons.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-stone-700">
            <li>• Review words saved during your lessons</li>
            <li>• Save your own words while reading (optional)</li>
            <li>• Track your reading progress over time</li>
            <li>• Study vocabulary in context</li>
            <li>• Prepare readings between lessons</li>
          </ul>

          <div className="mt-6">
            <p className="text-xs text-stone-500 mb-2">
              Inside the Mekuru Reading Companion
            </p>
            <img
              src="/app-preview.jpg"
              alt="Mekuru Reading Companion preview"
              className="rounded-xl border border-stone-200 shadow-sm"
            />
            <p className="mt-2 text-xs text-stone-500">
              Track your reading, review vocabulary, and study between lessons.
            </p>
          </div>

          <p className="mt-2 text-xs text-stone-500">
            Interested in trying it with your own books? Access may be available to a limited number of individuals — feel free to ask.
          </p>

          <p className="text-xs text-stone-500">
            Contact: mekuru.ej@gmail.com
          </p>
        </div>
      </div>

      {/* ABOUT ME */}
      <section className="mx-auto max-w-5xl px-6 pt-6 pb-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">About Me</h2>

          <img
            src="/devon.jpg"
            alt="Devon - Japanese reading coach"
            className="mx-auto mb-4 w-full max-w-sm rounded-2xl object-cover shadow-md md:float-left md:mr-6 md:mb-4"
          />
          <br />
          <p className="text-base leading-7 text-[#4f473d]">
            I grew up in Denver, Colorado, and eventually found my way to the countryside of Hokuto in Yamanashi, Japan. I&apos;ve now been in Japan for over 16 years.
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            I didn’t start learning Japanese when I was young. I came to it later, and for the most part, I had to figure it out on my own.
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            Because of that, I understand how frustrating it can feel, especially when things don’t click the way you expect them to.
          </p>
          <br />
          <br />
          <p className="text-base leading-7 text-[#4f473d]">
            Over time, I realized something important:
          </p>

          <p className="text-base leading-7 font-medium text-[#2f2a24]">
            • Perfection or complete understanding shouldn’t be the goal, especially in the early stages.
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            • A lot of learning comes from sitting in what you don’t understand yet and slowly watching it become clearer.
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            • That process — the unknown becoming known — is where real progress happens. And it&apos;s the fun part!
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            My background is in music, which taught me the importance of consistency and showing up even when things feel difficult. And with my over 16 years of teaching English, I know that while a teacher may have certain things they want to teach, it’s essential to approach them differently depending on the student.
          </p>

          <p className="text-base leading-7 text-[#4f473d]">
            That same mindset carries into how I approach reading and teaching Japanese.
          </p>

          <div className="clear-both" />
        </div>
      </section>
      <div className="pt-2 text-center">
        <a
          href="https://scheduler.zoom.us/mekuru/free-trial-japanese-reading-lesson"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-2xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700"
        >
          Book a Free Trial Lesson
        </a>
      </div>

      {/* FACEBOOK */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Stay connected</h2>

        <p className="text-base leading-7 text-[#4f473d]">
          There’s also a free Facebook group where learners can stay connected, ask questions, and follow what’s growing.
        </p>

        <a
          href="https://www.facebook.com/groups/japanesemekuru/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full border border-[#b6ab99] px-5 py-2 text-sm hover:bg-[#efe8dc]"
        >
          Join the Facebook Group
        </a>
      </section>

      {/* FINAL CTA */}
      <section className="space-y-3 pt-4 text-center">
        <h2 className="text-2xl font-semibold">You don’t have to figure this out alone.</h2>

        <p className="text-base text-[#4f473d]">
          If this approach feels right, feel free to reach out!
        </p>
      </section>

      <footer className="mt-16 border-t border-stone-200">
        <div className="mt-12 text-center text-xs text-stone-500 space-x-4">
          <Link href="/legal" className="hover:underline">
            Commercial Disclosure
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main >
  );
}