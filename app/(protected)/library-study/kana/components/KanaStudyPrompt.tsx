type KanaStudyPromptProps = {
    promptLabel: string;
    prompt: string;
};

export function KanaStudyPrompt({
    promptLabel,
    prompt,
}: KanaStudyPromptProps) {
    return (
        <div className="flex w-full flex-col items-center gap-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">
                {promptLabel}
            </div>

            {/* Kana learners often need larger character shapes than kanji-study answer text,
            so this page intentionally keeps the prompt oversized. */}
            <div className="text-6xl font-bold leading-none text-slate-950 sm:text-7xl">
                {prompt}
            </div>
        </div>
    );
}