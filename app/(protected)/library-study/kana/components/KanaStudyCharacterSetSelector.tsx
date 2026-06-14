type KanaSetOptions = {
    includeDakuten: boolean;
    includeYoon: boolean;
};

type KanaStudyCharacterSetSelectorProps = {
    kanaSetSummary: string;
    includeDakuten: boolean;
    includeYoon: boolean;
    onChange: (options: KanaSetOptions) => void;
};

export function KanaStudyCharacterSetSelector({
    kanaSetSummary,
    includeDakuten,
    includeYoon,
    onChange,
}: KanaStudyCharacterSetSelectorProps) {
    return (
        <details className="group mt-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                        Character Set
                    </h2>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                        {kanaSetSummary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Basic kana are always included. Add voiced marks or combo kana when ready.
                    </p>
                </div>

                <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 shadow-sm group-open:hidden">
                    Change
                </span>
                <span className="hidden shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700 group-open:inline-flex">
                    Close
                </span>
            </summary>

            <div className="mt-4 grid items-start gap-2 border-t border-slate-200 pt-4 sm:grid-cols-3">
                <div className="flex flex-col items-start justify-start rounded-2xl border border-slate-950 bg-slate-950 px-3 py-3 text-left text-white shadow-sm">
                    <div className="space-y-1">
                        <div className="text-sm font-black">Basic Kana</div>
                        <div className="text-sm font-semibold leading-5 text-slate-200">
                            あ、か、さ...
                        </div>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-300">
                        五十音（ごじゅうおん）
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        onChange({
                            includeDakuten: !includeDakuten,
                            includeYoon,
                        })
                    }
                    className={`flex flex-col items-start justify-start rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        includeDakuten
                            ? "border-slate-950 bg-slate-950 text-white shadow-md"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                >
                    <div className="space-y-2">
                        <div>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="text-sm font-black">Dakuten</span>
                                <span
                                    className={`text-sm font-semibold leading-5 ${
                                        includeDakuten ? "text-slate-200" : "text-slate-500"
                                    }`}
                                >
                                    が、ざ、だ、ば...
                                </span>
                            </div>
                            <div
                                className={`mt-0.5 text-[11px] font-semibold ${
                                    includeDakuten ? "text-slate-300" : "text-slate-500"
                                }`}
                            >
                                濁点（だくてん）
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="text-sm font-black">Handakuten</span>
                                <span
                                    className={`text-sm font-semibold leading-5 ${
                                        includeDakuten ? "text-slate-200" : "text-slate-500"
                                    }`}
                                >
                                    ぱ、ぴ、ぷ...
                                </span>
                            </div>
                            <div
                                className={`mt-0.5 text-[11px] font-semibold ${
                                    includeDakuten ? "text-slate-300" : "text-slate-500"
                                }`}
                            >
                                半濁点（はんだくてん）
                            </div>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onChange({
                            includeDakuten,
                            includeYoon: !includeYoon,
                        })
                    }
                    className={`flex flex-col items-start justify-start rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        includeYoon
                            ? "border-slate-950 bg-slate-950 text-white shadow-md"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                >
                    <div className="space-y-1">
                        <div className="text-sm font-black">Combo Sounds</div>
                        <div
                            className={`text-sm font-semibold leading-5 ${
                                includeYoon ? "text-slate-200" : "text-slate-500"
                            }`}
                        >
                            きゃ、しゅ、りょ...
                        </div>
                    </div>
                    <div
                        className={`mt-1 text-[11px] font-semibold ${
                            includeYoon ? "text-slate-300" : "text-slate-500"
                        }`}
                    >
                        拗音（ようおん）
                    </div>
                </button>
            </div>
        </details>
    );
}