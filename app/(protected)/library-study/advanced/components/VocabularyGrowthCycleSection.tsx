const cycleSteps = [
    {
        title: "Read and Notice",
        description: "Meet words naturally inside real books.",
        href: "/books",
    },
    {
        title: "Save words",
        description: "Save the words you want support with while reading.",
        href: "/library/curiosity-reading-index",
    },
    {
        title: "Book Flashcards",
        description:
            "Study saved words from one book when you want a focused session.",
        href: "/library-study/book-flashcards",
    },
    {
        title: "Saved Words Review",
        description: "Review saved words across books without moving colors.",
        href: "/library-study/practice",
    },
    {
        title: "Ability Check",
        description:
            "When enough words are ready, Mekuru shows an alert on your Library page.",
    },
    {
        title: "Mastered Words",
        description:
            "Revisit mastered words so they stay alive in your reading.",
        href: "/library-study/practice?color=purple",
    },
];

export default function VocabularyGrowthCycleSection() {
    return (
        <details
            open
            className="group mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                            The cycle
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-slate-950">
                            From saved word to real reading
                        </h2>

                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            Advanced Study helps saved words move through repeated noticing,
                            light checking, and real reading. The colors flow through the cycle as gentle
                            signals, not grades.
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Close</span>
                    </span>
                </div>
            </summary>

            <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 md:block">
                    <svg
                        viewBox="0 0 920 620"
                        className="h-[620px] w-full"
                        role="img"
                        aria-label="Mekuru Vocabulary Growth Cycle"
                    >
                        <defs>
                            <radialGradient id="cycle-sun" cx="50%" cy="42%" r="66%">
                                <stop offset="0%" stopColor="#fff7ed" />
                                <stop offset="58%" stopColor="#fde68a" />
                                <stop offset="100%" stopColor="#fbbf24" />
                            </radialGradient>
                            <filter id="cycle-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
                                <feGaussianBlur stdDeviation="12" />
                            </filter>
                            <marker
                                id="cycle-arrow"
                                markerHeight="8"
                                markerWidth="8"
                                orient="auto"
                                refX="7"
                                refY="4"
                            >
                                <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
                            </marker>
                        </defs>

                        <rect x="0" y="0" width="920" height="620" fill="#f8fafc" />

                        <g
                            fill="none"
                            stroke="#94a3b8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            opacity="0.42"
                        >
                            <path d="M84 74 L99 62 L114 74" />
                            <path d="M150 102 L163 92 L176 102" />
                            <path d="M210 66 L222 57 L234 66" />
                        </g>

                        <path
                            d="M75 345 C180 285 265 405 390 340 C520 270 605 350 735 292 C800 263 845 260 880 278"
                            fill="none"
                            stroke="#e0f2fe"
                            strokeLinecap="round"
                            strokeWidth="68"
                            opacity="0.82"
                        />
                        <path
                            d="M75 345 C180 285 265 405 390 340 C520 270 605 350 735 292 C800 263 845 260 880 278"
                            fill="none"
                            stroke="#bae6fd"
                            strokeLinecap="round"
                            strokeWidth="50"
                            opacity="0.72"
                        />
                        <path
                            d="M92 334 C205 306 270 376 390 326 C518 273 612 334 728 284 C790 258 837 254 865 270"
                            fill="none"
                            stroke="#fecaca"
                            strokeLinecap="round"
                            strokeWidth="8"
                            opacity="0.85"
                        />
                        <path
                            d="M92 347 C205 320 282 388 400 338 C520 288 614 345 733 296 C796 270 834 268 866 282"
                            fill="none"
                            stroke="#fed7aa"
                            strokeLinecap="round"
                            strokeWidth="8"
                            opacity="0.85"
                        />
                        <path
                            d="M92 360 C210 334 285 400 405 351 C525 302 618 360 738 309 C795 285 836 282 868 296"
                            fill="none"
                            stroke="#fde68a"
                            strokeLinecap="round"
                            strokeWidth="8"
                            opacity="0.85"
                        />
                        <path
                            d="M92 373 C210 348 295 414 412 366 C532 316 625 375 742 323 C800 299 838 298 868 310"
                            fill="none"
                            stroke="#bbf7d0"
                            strokeLinecap="round"
                            strokeWidth="8"
                            opacity="0.85"
                        />
                        <path
                            d="M92 386 C218 364 305 430 420 380 C545 326 630 390 746 338 C802 313 840 314 866 326"
                            fill="none"
                            stroke="#ddd6fe"
                            strokeLinecap="round"
                            strokeWidth="8"
                            opacity="0.85"
                        />

                        <path
                            d="M465 98 C620 105 785 170 787 245
                               C900 375 830 548 760 540
                               C610 628 310 628 155 455
                               C25 330 42 158 148 151
                               C250 46 400 34 465 71"
                            fill="none"
                            stroke="#94a3b8"
                            strokeLinecap="round"
                            strokeWidth="3"
                            strokeDasharray="10 12"
                            opacity="0.72"
                        />

                        <a
                            href="/books"
                            aria-label="Open your library to read and notice words"
                            className="cursor-pointer"
                        >
                            <g>
                            <rect
                                x="320"
                                y="25"
                                width="290"
                                height="92"
                                rx="28"
                                fill="#ffffff"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                            />
                            <text
                                x="465"
                                y="60"
                                fill="#0f172a"
                                fontSize="20"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Read and Notice
                            </text>
                            <text
                                x="465"
                                y="87"
                                fill="#475569"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Read
                            </text>
                            </g>
                        </a>

                        <a
                            href="/library/curiosity-reading-index"
                            aria-label="Open your library to save words from a book"
                            className="cursor-pointer"
                        >
                            <g>
                            <rect
                                x="675"
                                y="245"
                                width="225"
                                height="100"
                                rx="28"
                                fill="#ffffff"
                                stroke="#cbd5e1"
                                strokeWidth="2"
                            />
                            <text
                                x="787"
                                y="282"
                                fill="#0f172a"
                                fontSize="21"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Save words
                            </text>
                            <text
                                x="787"
                                y="309"
                                fill="#475569"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Remember
                            </text>
                            </g>
                        </a>

                        <a
                            href="/library-study/book-flashcards"
                            aria-label="Open Book Flashcards"
                            className="cursor-pointer"
                        >
                            <g>
                            <rect
                                x="635"
                                y="425"
                                width="270"
                                height="100"
                                rx="28"
                                fill="#eef2ff"
                                stroke="#c7d2fe"
                                strokeWidth="2"
                            />
                            <text
                                x="770"
                                y="462"
                                fill="#1e1b4b"
                                fontSize="21"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Book Flashcards
                            </text>
                            <text
                                x="770"
                                y="489"
                                fill="#4338ca"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Focus
                            </text>
                            </g>
                        </a>

                        <a
                            href="/library-study/practice"
                            aria-label="Open Saved Words Review"
                            className="cursor-pointer"
                        >
                            <g>
                            <rect
                                x="315"
                                y="515"
                                width="290"
                                height="100"
                                rx="28"
                                fill="#ecfeff"
                                stroke="#bae6fd"
                                strokeWidth="2"
                            />
                            <text
                                x="460"
                                y="552"
                                fill="#0f172a"
                                fontSize="21"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Saved Words Review
                            </text>
                            <text
                                x="460"
                                y="579"
                                fill="#0369a1"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Encounter
                            </text>
                            </g>
                        </a>

                        <g>
                            <rect
                                x="25"
                                y="405"
                                width="260"
                                height="100"
                                rx="28"
                                fill="#ecfdf5"
                                stroke="#bbf7d0"
                                strokeWidth="2"
                            />
                            <text
                                x="155"
                                y="442"
                                fill="#064e3b"
                                fontSize="21"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Ability Check
                            </text>
                            <text
                                x="155"
                                y="469"
                                fill="#047857"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Check
                            </text>
                        </g>

                        <a
                            href="/library-study/practice?color=purple"
                            aria-label="Open purple review to strengthen what you know"
                            className="cursor-pointer"
                        >
                            <g>
                            <rect
                                x="25"
                                y="105"
                                width="245"
                                height="92"
                                rx="28"
                                fill="#f5f3ff"
                                stroke="#ddd6fe"
                                strokeWidth="2"
                            />
                            <text
                                x="148"
                                y="135"
                                fill="#4c1d95"
                                fontSize="19"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Mastered
                            </text>
                            <text
                                x="148"
                                y="160"
                                fill="#4c1d95"
                                fontSize="19"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Words
                            </text>
                            <text
                                x="148"
                                y="183"
                                fill="#6d28d9"
                                fontSize="14"
                                textAnchor="middle"
                            >
                                Mastered Words
                            </text>
                            </g>
                        </a>

                        <a
                            href="/library-study/word-sky"
                            aria-label="Open Word Sky"
                            className="cursor-pointer"
                        >
                            <g>
                            <path
                                d="M682 38 C692 12 732 6 760 22 C781 0 829 8 841 40 C875 42 899 66 893 98 C890 128 864 146 832 141 L704 141 C672 141 649 119 655 90 C658 70 669 50 682 38 Z"
                                fill="#f0f9ff"
                                stroke="#7dd3fc"
                                strokeWidth="2"
                            />
                            <text
                                x="775"
                                y="80"
                                fill="#075985"
                                fontSize="19"
                                fontWeight="900"
                                textAnchor="middle"
                            >
                                Word Sky
                            </text>
                            <text
                                x="775"
                                y="107"
                                fill="#0369a1"
                                fontSize="13"
                                textAnchor="middle"
                            >
                                Fast track words you already know.
                            </text>
                            </g>
                        </a>
                        <path
                            d="M852 140 C885 178 875 224 832 252"
                            fill="none"
                            stroke="#7dd3fc"
                            strokeDasharray="7 7"
                            strokeLinecap="round"
                            strokeWidth="3"
                            markerEnd="url(#cycle-arrow)"
                        />
                        <circle
                            cx="460"
                            cy="305"
                            r="132"
                            fill="#fde68a"
                            opacity="0.34"
                            filter="url(#cycle-soft-glow)"
                        />
                        <circle
                            cx="460"
                            cy="305"
                            r="108"
                            fill="url(#cycle-sun)"
                            stroke="#fbbf24"
                            strokeWidth="1.5"
                        />
                        <circle
                            cx="460"
                            cy="305"
                            r="88"
                            fill="#fff7ed"
                            opacity="0.62"
                        />
                        <g opacity="0.76">
                            <path
                                d="M118 268 C98 262 94 239 114 228 C121 205 152 202 164 224 C186 229 189 257 168 268 Z"
                                fill="#dcfce7"
                                stroke="#86efac"
                                strokeWidth="2"
                            />
                            <path
                                d="M141 266 L141 306"
                                fill="none"
                                stroke="#92400e"
                                strokeLinecap="round"
                                strokeWidth="6"
                            />
                            <path
                                d="M141 286 L125 273"
                                fill="none"
                                stroke="#92400e"
                                strokeLinecap="round"
                                strokeWidth="3"
                            />
                            <path
                                d="M141 279 L158 266"
                                fill="none"
                                stroke="#92400e"
                                strokeLinecap="round"
                                strokeWidth="3"
                            />
                        </g>
                        <text
                            x="460"
                            y="278"
                            fill="#78350f"
                            fontSize="22"
                            fontWeight="900"
                            textAnchor="middle"
                        >
                            Mekuru
                        </text>
                        <text
                            x="460"
                            y="307"
                            fill="#78350f"
                            fontSize="22"
                            fontWeight="900"
                            textAnchor="middle"
                        >
                            Vocabulary
                        </text>
                        <text
                            x="460"
                            y="336"
                            fill="#78350f"
                            fontSize="22"
                            fontWeight="900"
                            textAnchor="middle"
                        >
                            Growth Cycle
                        </text>
                    </svg>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {cycleSteps.map((step, index) => {
                        const className =
                            "rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-sm";
                        const content = (
                            <>
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                                    {index + 1}
                                </span>
                                <h3 className="text-lg font-black text-slate-950">
                                    {step.title}
                                </h3>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {step.description}
                            </p>
                            </>
                        );

                        return step.href ? (
                            <a key={step.title} href={step.href} className={className}>
                                {content}
                            </a>
                        ) : (
                            <div key={step.title} className={className}>
                                {content}
                            </div>
                        );
                    })}
                </div>
            </div>
        </details>
    );
}
