import Link from "next/link";
import VocabularyGrowthCycleSection from "./components/VocabularyGrowthCycleSection";

const advancedTools = [
    {
        title: "Book Flashcards",
        href: "/library-study/book-flashcards",
        eyebrow: "Targeted Study",
        className: "border-indigo-200 bg-indigo-50 text-indigo-950",
    },
    {
        title: "Saved Words Review",
        href: "/library-study/practice",
        eyebrow: "Across books",
        className: "border-sky-200 bg-sky-50 text-sky-950",
    },
    {
        title: "Ability Check",
        href: "/library-study/check",
        eyebrow: "Color movement",
        className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    {
        title: "久しぶり Review",
        href: "/library-study/practice?color=purple",
        eyebrow: "Mastered words",
        className: "border-violet-200 bg-violet-50 text-violet-950",
    },
];

export default function AdvancedStudyPage() {
    return (
        <main className="min-h-screen bg-slate-100 px-5 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Advanced Study
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                        Mekuru Vocabulary Growth Cycle
                    </h1>

                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Save words while reading, study them in different ways, and meet them
                        again until they become easier to notice in real books.
                    </p>
                </div>

                <details
                    open
                    className="group rounded-3xl border border-sky-200 bg-white p-6 text-slate-900 shadow-sm"
                >
                    <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                                    Mekuru Vocabulary Philosophy
                                </p>

                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                    Noticing, not cramming
                                </h2>
                            </div>

                            <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                                <span className="group-open:hidden">Open</span>
                                <span className="hidden group-open:inline">Close</span>
                            </span>
                        </div>
                    </summary>

                    <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-sm leading-7 text-slate-700">
                            Mekuru’s goal is to support natural learning through native
                            material. Advanced vocabulary study is built around noticing:
                            meeting a word in real reading, seeing it again in a focused
                            study moment, checking it lightly, and then returning it to books
                            so recognition can grow.
                        </p>

                        <p className="mt-3 text-sm leading-7 text-slate-700">
                            The goal is not to force a word into memory all at once. The goal
                            is to give each word enough useful encounters that the next time
                            you see it in a book, it has a better chance of feeling familiar.
                        </p>

                        <p className="mt-3 text-sm leading-7 text-slate-700">
                            Full-access study tools apply this idea to your saved words with
                            Book Flashcards, Saved Words Review, Ability Check, and color
                            movement. The colors are not grades; they are gentle signals for
                            where a word is in its noticing cycle.
                        </p>
                    </div>
                </details>

                <section className="mt-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Quick study jumps
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {advancedTools.map((tool) => (
                            <Link
                                key={tool.href}
                                href={tool.href}
                                className={`group rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tool.className}`}
                            >
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                                    {tool.eyebrow}
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <h3 className="min-w-0 text-base font-black leading-tight">
                                        {tool.title}
                                    </h3>

                                    <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm transition group-hover:bg-white">
                                        →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <VocabularyGrowthCycleSection />

                <details className="group mt-6 rounded-3xl border border-sky-200 bg-white p-6 text-slate-900 shadow-sm">
                    <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                                    Reading Colors
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                    What do the colors mean?
                                </h2>
                            </div>

                            <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                                <span className="group-open:hidden">Open</span>
                                <span className="hidden group-open:inline">Close</span>
                            </span>
                        </div>
                    </summary>

                    <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-sm leading-7 text-slate-700">
                            Mekuru uses colors to help you notice words, track movement, and separate real
                            reading encounters from Ability Check gates.
                        </p>

                        <p className="mt-3 text-sm leading-7 text-slate-700">
                            Some colors come from reading encounters. These show that you have met the word
                            in real reading and are building support before a gate check.
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                                    Red
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Early encounter support
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    You have started meeting this word in real reading, but it is still new.
                                    No need to force it yet.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">
                                    Orange
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Repeated encounter support
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    This word has appeared again, but Mekuru is still building reading support.
                                    Just keep noticing it when it appears.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-slate-950">
                                    Yellow
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Ready for gate checks
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    This word has enough reading support for a gate check.
                                    You can try Ability Check, or give it more time if it still feels too hard.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                                        Red 2
                                    </span>
                                    <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">
                                        Orange 2
                                    </span>
                                    <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-slate-950">
                                        Yellow 2
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base font-black text-slate-950">
                                    Extra reading support
                                </h3>

                                <p className="mt-2 text-sm leading-7 text-slate-700">
                                    If Yellow still feels too hard, Mekuru can wait before asking again. Red 2,
                                    Orange 2, and Yellow 2 mean the word is getting another round of real
                                    reading support before returning to Ability Check.
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-7 text-slate-700">
                            Other colors come from Ability Check. These show whether the word
                            has passed a reading or meaning gate.
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-black text-white">
                                    Green
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Reading Gate
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word is ready for a reading question in Ability Check.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                                    Blue
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Meaning Gate
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The reading is supported, and the word is ready for a meaning
                                    question.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                                    Purple
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Mastered
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word has cleared the major gates and no longer needs
                                    regular attention.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-slate-500 px-3 py-1 text-xs font-black text-white">
                                    Limbo
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Between gates
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word is between Ability Check gates and may need another
                                    look before moving forward.
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-7 text-slate-700">
                            The colors are not grades. They are movement signals. They help
                            you notice which words need support, which words are ready to be
                            checked, and which words can quietly return to real reading.
                        </p>
                    </div>
                </details>

                <div className="mt-6 text-center">
                    <Link
                        href="/library-study"
                        className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Back to Study Hub
                    </Link>
                </div>
            </div>
        </main>
    );
}
