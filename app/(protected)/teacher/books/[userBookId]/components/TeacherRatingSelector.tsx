type RatingOption = readonly [number, string];

type TeacherRatingSelectorProps = {
    title: string;
    description: string;
    value: string;
    options: readonly RatingOption[];
    label: string;
    stars5: (value: number | null) => string;
    onChange: (value: string) => void;
};

export function TeacherRatingSelector({
    title,
    description,
    value,
    options,
    label,
    stars5,
    onChange,
}: TeacherRatingSelectorProps) {
    const selectedRating = value ? Number(value) : null;

    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-black text-stone-900">{title}</h2>
                <p className="mt-1 text-sm text-stone-500">{description}</p>
            </div>

            <div className="space-y-2">
                {options.map(([rating, optionLabel]) => {
                    const isSelected = selectedRating === rating;

                    return (
                        <button
                            key={rating}
                            type="button"
                            onClick={() => onChange(String(rating))}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                isSelected
                                    ? "border-stone-900 bg-stone-100 shadow-sm"
                                    : "border-stone-200 bg-white hover:bg-stone-50"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-stone-900">
                                    {rating}/5 · {optionLabel}
                                </div>
                                <div className="text-sm text-amber-600">
                                    {stars5(rating)}
                                </div>
                            </div>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                >
                    Clear rating
                </button>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                {label}
            </div>
        </section>
    );
}