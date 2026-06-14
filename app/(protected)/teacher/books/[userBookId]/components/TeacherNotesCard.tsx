type TeacherNotesCardProps = {
    notes: string;
    onChange: (value: string) => void;
};

export function TeacherNotesCard({
    notes,
    onChange,
}: TeacherNotesCardProps) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-stone-900">Teacher Notes</h2>
            <p className="mt-1 text-sm text-stone-500">
                Private teaching notes, prep ideas, student fit, or lesson reminders.
            </p>

            <textarea
                value={notes}
                onChange={(event) => onChange(event.target.value)}
                rows={8}
                className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-500"
                placeholder="Add teacher notes..."
            />
        </section>
    );
}