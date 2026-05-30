import MonthlySmallMetricCard from "./MonthlySmallMetricCard";

type MonthlyMoodSectionProps = {
    // Mood rules and value formatting stay in page.tsx during the visual pass.
    loading: boolean;
    title: string;
    description: string;
    readingTimeLabel: string;
    listeningTimeLabel: string;
    savedWordsLabel: string | number;
};

export default function MonthlyMoodSection({
    loading,
    title,
    description,
    readingTimeLabel,
    listeningTimeLabel,
    savedWordsLabel,
}: MonthlyMoodSectionProps) {
    return (
        <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                Monthly mood
            </p>

            <h2 className="mt-2 text-2xl font-black text-stone-900">{title}</h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MonthlySmallMetricCard
                    label="Reading"
                    value={readingTimeLabel}
                    loading={loading}
                    labelStyle="eyebrow"
                    valueSize="xl"
                />

                <MonthlySmallMetricCard
                    label="Listening"
                    value={listeningTimeLabel}
                    loading={loading}
                    labelStyle="eyebrow"
                    valueSize="xl"
                />

                <MonthlySmallMetricCard
                    label="Saved words"
                    value={savedWordsLabel}
                    loading={loading}
                    labelStyle="eyebrow"
                    valueSize="xl"
                />
            </div>
        </div>
    );
}