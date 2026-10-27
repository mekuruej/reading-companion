import Image from "next/image";
import Link from "next/link";
import AuthReturnRedirect from "@/components/AuthReturnRedirect";

const primary = "inline-flex min-h-12 items-center justify-center rounded-full bg-[#514269] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#403251] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269]";
const secondary = "inline-flex min-h-12 items-center justify-center rounded-full border border-[#c9bed7] bg-white/70 px-6 py-3 text-center text-sm font-semibold text-[#473950] transition hover:bg-[#eee7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269]";
const textLink = "inline-flex min-h-11 items-center font-semibold underline decoration-[#a99ab9] underline-offset-4 hover:text-[#514269] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269]";
const interestList = "https://docs.google.com/forms/d/e/1FAIpQLSd2vKWH_5EMTTAcBHNSX6baymY2-RTDaNvmFYWkfzrVp2k6YA/viewform?usp=dialog";

const companionFeatures = [
  { number: "01", title: "A library of your own", text: "Keep your books together, from your current read to the ones you finished—or decided not to finish." },
  { number: "02", title: "Make time for a few pages", text: "Reading and listening timers help you keep a record of the time you spend with your books." },
  { number: "03", title: "See your reading life grow", text: "Look back at your reading history, progress, and statistics. Every little reading session belongs in the story." },
];
const journalFeatures = [
  { title: "Characters", text: "Who was that again? Keep names, relationships, and the details that make people memorable." },
  { title: "Plot", text: "Follow the turns in the story and leave yourself a trail back to what happened." },
  { title: "Quotes", text: "Keep a memorable line and a note of where you found it, for your own reading." },
  { title: "Notes", text: "Catch a question, a connection, or something you want to bring to book club." },
  { title: "Review", text: "Put the experience into your own words while the book is still fresh in your mind." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#fbf8f2] text-[#332e38] selection:bg-[#e4d7f1]">
      <AuthReturnRedirect />
      <a href="#main-content" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="MEKURU home" className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269]">
          <Image src="/mekuru-logo.png" alt="" width={68} height={68} priority className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
          <span><span className="block text-xl font-bold tracking-[0.12em]">MEKURU</span><span className="block text-xs text-[#63596b]">Your Reading Companion</span></span>
        </Link>
        <nav aria-label="Public navigation" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <a href="#companion" className={`${textLink} hidden no-underline md:inline-flex`}>The companion</a>
          <a href="#japanese-tools" className={`${textLink} hidden no-underline md:inline-flex`}>Japanese tools</a>
          <Link href="/login" className={`${textLink} no-underline`}>Log in <span aria-hidden="true" className="ml-2">↗</span></Link>
        </nav>
      </header>

      <div id="main-content">
        <section aria-labelledby="hero-heading" className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14 lg:px-12 lg:pt-20">
          <div>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#665276]">For the books. For the little discoveries.</p>
            <h1 id="hero-heading" className="max-w-3xl font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Read Japanese.<br /><span className="text-[#705388]">Remember<br className="hidden lg:block" /> the journey.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#63596b] sm:text-lg">From your first authentic Japanese book to your next literary adventure, MEKURU helps you organize your reading, explore the language, remember what you&apos;ve learned, and celebrate your progress.</p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link href="/login/beta-signup" className={primary}>Start your free Reading Companion</Link>
              <Link href="/books" className={secondary}>Open MEKURU</Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#63596b]">Free reading tools for every language. Optional paid tools for learning Japanese.</p>
          </div>

          {/* Original editorial illustration, not a representation of the application UI. */}
          <div className="relative mx-auto w-full max-w-sm px-3 py-6 sm:px-6 lg:py-12">
            <div aria-hidden="true" className="absolute inset-0 rounded-[50%] bg-[#eee6f4]" />
            <div aria-hidden="true" className="absolute -right-1 top-3 font-serif text-4xl text-[#9278aa]">✧</div>
            <div className="relative rotate-[-3deg] rounded-r-[2rem] border border-[#d8cce2] border-l-[14px] border-l-[#78618e] bg-[#fdfbf6] px-6 py-10 shadow-[12px_16px_0_#ddd0e8] sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6a5978]">A reader&apos;s notebook</p>
              <p className="mt-7 font-serif text-3xl leading-tight text-[#473950]">The plot twist.<br />The new word.<br />The bit you<br />can&apos;t stop<br />thinking about.</p>
              <div aria-hidden="true" className="my-7 h-px bg-[#d8cce2]" />
              <p className="text-sm leading-6 text-[#63596b]">Keep a little of every book with you.</p>
              <span aria-hidden="true" className="absolute -top-px right-8 h-12 w-7 bg-[#9fbaac] [clip-path:polygon(0_0,100%_0,100%_100%,50%_76%,0_100%)]" />
            </div>
          </div>
        </section>

        <section aria-labelledby="your-way-heading" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <h2 id="your-way-heading" className="mb-7 text-center font-serif text-3xl sm:text-4xl">What brings you to the bookshelf?</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <a href="#japanese-tools" className="group rounded-[2rem] border border-[#d7c9e2] bg-[#eee6f4] p-7 transition hover:bg-[#e8dcf0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269] sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#655074]">A little language adventure</p>
              <h3 className="mt-4 font-serif text-3xl">I&apos;m learning Japanese</h3>
              <p className="mt-4 max-w-lg leading-7 text-[#574b60]">Read authentic Japanese books, collect vocabulary, practice with flashcards, and grow as a reader.</p>
              <p className="mt-4 text-sm leading-6 text-[#574b60]">Start with the free Reading Companion. Explore optional Japanese Learning Tools for vocabulary, Book Flashcards, and Follow-Along.</p>
              <span className="mt-7 inline-block text-sm font-semibold group-hover:underline">Find your reading rhythm <span aria-hidden="true">→</span></span>
            </a>
            <a href="#journal" className="group rounded-[2rem] border border-[#d4ddcc] bg-[#edf0e7] p-7 transition hover:bg-[#e5eadb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#514269] sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#53634d]">For your inner reading detective</p>
              <h3 className="mt-4 font-serif text-3xl">I love reading, but I forget the details!</h3>
              <p className="mt-4 max-w-lg leading-7 text-[#4f5b49]">Keep track of characters, plot twists, favorite quotes, and all those things you wanted to bring up at book club.</p>
              <p className="mt-4 text-sm leading-6 text-[#4f5b49]">Your free Reading Journal has room for Characters, Plot, Quotes, Notes, and Review—in whatever language you read.</p>
              <span className="mt-7 inline-block text-sm font-semibold group-hover:underline">Keep the story with you <span aria-hidden="true">→</span></span>
            </a>
          </div>
        </section>

        <section id="companion" aria-labelledby="companion-heading" className="scroll-mt-8 border-y border-[#e7dfd3] bg-[#f3eee5] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#665276]">The free Reading Companion</p>
            <h2 id="companion-heading" className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Your books. Your pace.<br />Your very own reading life.</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {companionFeatures.map(feature => <article key={feature.number} className="border-t border-[#d8cdbd] pt-5"><span className="font-serif text-xl text-[#776489]">{feature.number}</span><h3 className="mt-3 text-lg font-semibold">{feature.title}</h3><p className="mt-3 leading-7 text-[#63596b]">{feature.text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="journal" aria-labelledby="journal-heading" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#665276]">Meet your free Reading Journal</p>
            <h2 id="journal-heading" className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A notebook for<br />your inner<br /><span className="text-[#705388]">reading detective.</span></h2>
            <p className="mt-6 max-w-md leading-8 text-[#63596b]">You know that feeling when someone asks about a book you loved… and every character&apos;s name disappears? Leave yourself a few clues as you read.</p>
            <Link href="/login/beta-signup" className={`${textLink} mt-6`}>Start keeping the details <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
          <div className="relative rounded-[2rem] border border-[#dfd4c3] bg-[#fffdf8] p-6 shadow-[6px_6px_0_#eae3d7] sm:p-9">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#786551]">Little clues. Lasting memories.</p>
            <dl className="divide-y divide-[#e8dfd1]">{journalFeatures.map(feature => <div key={feature.title} className="grid gap-2 py-4 sm:grid-cols-[6.5rem_1fr] sm:gap-5"><dt className="font-serif text-xl text-[#624b74]">{feature.title}</dt><dd className="text-sm leading-7 text-[#63596b]">{feature.text}</dd></div>)}</dl>
            <p className="mt-5 text-xs leading-6 text-[#63596b]">Part of the Reading Companion. No Japanese study membership needed.</p>
          </div>
        </section>

        <section id="japanese-tools" aria-labelledby="tools-heading" className="scroll-mt-8 bg-[#eee7f4] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:gap-20"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#665276]">Optional paid Japanese Learning Tools</p><h2 id="tools-heading" className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Make the words<br />part of your story.</h2></div><p className="self-end leading-8 text-[#574b60]">Reading real Japanese brings little discoveries on every page. MEKURU helps you collect the words you meet and return to them in your own books.</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { title: "Collect vocabulary", text: "Save words and meanings while you read with Curiosity Reading. Keep them connected to the book where you met them." },
                { title: "Book Flashcards", text: "Return to vocabulary from your books with flashcard modes for practicing Japanese reading and meaning." },
                { title: "Follow-Along", text: "Reread with your saved vocabulary close at hand. Meet familiar words again in their original reading context." },
              ].map(feature => <article key={feature.title} className="rounded-3xl border border-[#d8cbe3] bg-[#fcf9fe] p-6"><h3 className="font-serif text-2xl">{feature.title}</h3><p className="mt-4 text-sm leading-7 text-[#63596b]">{feature.text}</p></article>)}
            </div>
            <div className="mt-8 flex flex-col items-start gap-5 border-t border-[#d8cbe3] pt-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-7 text-[#574b60]">The Reading Companion is free. Japanese Learning Tools require eligible learning access. An invitation-based Guided App Trial is available separately; some advanced activities are not included in trial access.</p>
              <a href={interestList} target="_blank" rel="noopener noreferrer" className={`${secondary} shrink-0`}>Ask about a Guided App Trial <span className="sr-only">(opens in a new tab)</span></a>
            </div>
          </div>
        </section>

        <section aria-labelledby="every-language-heading" className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#665276]">A welcome for every bookshelf</p>
          <h2 id="every-language-heading" className="mt-4 font-serif text-4xl sm:text-5xl">Reading in another language?</h2>
          <p className="mt-6 leading-8 text-[#63596b]">MEKURU isn&apos;t just for Japanese books! While our language-learning tools currently focus on Japanese, our free Reading Companion is for everyone.</p>
          <p className="mt-4 leading-8 text-[#63596b]">Keep track of characters, remember important plot details, collect memorable quotes, and jot down questions or ideas for your next book club meeting.</p>
          <p className="mt-7 font-serif text-2xl italic text-[#705388]">Because every good book deserves to be remembered.</p>
        </section>

        <section aria-labelledby="teaching-heading" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:px-12">
          <div className="grid gap-7 rounded-[2rem] border border-[#ddd1e6] bg-[#f4eff7] p-7 sm:p-10 md:grid-cols-2 md:gap-12">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#665276]">A little human support</p><h2 id="teaching-heading" className="mt-4 font-serif text-3xl">Read with a guide.</h2><p className="mt-4 text-sm leading-7 text-[#63596b]">Private Japanese reading coaching is available for adults, with guided support for pronunciation, vocabulary, grammar, and comprehension.</p><Link href="/private-lessons" className={`${textLink} mt-4 text-sm`}>Explore private reading coaching <span aria-hidden="true" className="ml-2">→</span></Link></div>
            <div><h3 className="font-serif text-2xl md:mt-8">And a shared love of books.</h3><p className="mt-4 text-sm leading-7 text-[#63596b]">Guided reading cohorts are planned, with enrollment not yet open. Each cohort depends on its selected material and any necessary permissions. The free community is separate from paid lessons and planned cohorts.</p><Link href="/reading-groups" className={`${textLink} mt-4 text-sm`}>Read about the plans <span aria-hidden="true" className="ml-2">→</span></Link></div>
          </div>
        </section>

        <section aria-labelledby="last-page-heading" className="px-5 pb-20 text-center sm:px-8">
          <h2 id="last-page-heading" className="font-serif text-4xl sm:text-5xl">There&apos;s a whole book ahead of you.</h2>
          <p className="mx-auto mt-5 max-w-lg leading-7 text-[#63596b]">A few pages, a small discovery, something worth remembering. Make a little room for your reading.</p>
          <Link href="/login/beta-signup" className={`${primary} mt-7`}>Start your free Reading Companion</Link>
          <p className="mt-4 text-sm text-[#63596b]">Already here? <Link href="/login" className={textLink}>Log in to MEKURU</Link></p>
        </section>
      </div>

      <footer className="border-t border-[#e7dfd3] px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold tracking-widest">MEKURU</p><p className="mt-1 text-sm text-[#63596b]">Your Reading Companion · ページをめくって、話しまくろう</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#63596b]">{[{ href: "/japanese", label: "Japanese lessons" }, { href: "/english", label: "English lessons" }, { href: "/legal", label: "Legal" }, { href: "/terms", label: "Terms" }, { href: "/privacy", label: "Privacy" }].map(link => <Link key={link.href} href={link.href} className={textLink}>{link.label}</Link>)}</nav></div>
      </footer>
    </main>
  );
}
