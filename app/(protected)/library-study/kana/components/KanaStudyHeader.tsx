export function KanaStudyHeader() {
    return (
        <>
            <div className="mb-2 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-3xl shadow-sm">
                        あ
                    </div>

                    <h1 className="text-center text-2xl font-semibold text-slate-950">
                        Hiragana & Katakana Study
                    </h1>
                </div>
            </div>

            <p className="mt-2 w-full max-w-3xl text-center text-sm font-semibold text-slate-600">
                Choose your study mode and character sets before studying.
            </p>
        </>
    );
}