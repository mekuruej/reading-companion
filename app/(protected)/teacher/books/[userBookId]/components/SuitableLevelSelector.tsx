type SuitableLevelOption = {
    readonly value: string;
    readonly title: string;
    readonly plain: string;
    readonly cefr: string;
    readonly jlpt: string;
    readonly feel: string;
};

type SuitableLevelSelectorProps = {
    value: string;
    options: readonly SuitableLevelOption[];
    selectedOption: SuitableLevelOption | undefined;
    onChange: (value: string) => void;
};

export function SuitableLevelSelector({
    value,
    options,
    selectedOption,
    onChange,
}: SuitableLevelSelectorProps) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-black text-stone-900">Suitable Level</h2>
                <p className="mt-1 text-sm text-stone-500">
                    Pick the level that feels suitable with guidance, not necessarily the level where the book becomes easy.
                </p>
            </div>

            <div className="space-y-2">
                {options.map((option) => {
                    const isSelected = value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isSelected
                                    ? "border-stone-900 bg-stone-100 shadow-sm"
                                    : "border-stone-200 bg-white hover:bg-stone-50"
                                }`}
                        >
                            <div className="text-sm font-semibold text-stone-900">
                                {option.title} · {option.plain} ({option.cefr} · {option.jlpt})
                            </div>
                            <div className="mt-1 text-sm leading-6 text-stone-600">
                                {option.feel}
                            </div>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                >
                    Clear level
                </button>
            </div>

            {selectedOption ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Selected: {selectedOption.title} · {selectedOption.plain}
                </div>
            ) : null}
        </section>
    );
}