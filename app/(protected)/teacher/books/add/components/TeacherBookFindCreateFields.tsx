type TeacherBookFindCreateFieldsProps = {
    title: string;
    titleReading: string;
    isbn13: string;
    asin: string;
    isBookRequest: boolean;
    titleNeedsManualResearch: boolean;
    onTitleChange: (value: string) => void;
    onTitleReadingChange: (value: string) => void;
    onIsbn13Change: (value: string) => void;
    onAsinChange: (value: string) => void;
};

export function TeacherBookFindCreateFields({
    title,
    titleReading,
    isbn13,
    asin,
    isBookRequest,
    titleNeedsManualResearch,
    onTitleChange,
    onTitleReadingChange,
    onIsbn13Change,
    onAsinChange,
}: TeacherBookFindCreateFieldsProps) {
    return (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
                <label className="mb-1 block text-sm font-semibold">Title *</label>
                <input
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder={
                        isBookRequest
                            ? "Enter the researched book title"
                            : "Book title"
                    }
                    className="w-full rounded-xl border border-slate-500 px-4 py-3"
                />
                {isBookRequest && titleNeedsManualResearch ? (
                    <p className="mt-2 text-xs font-medium text-amber-800">
                        The request only gave an ISBN, so the real title needs to be entered here.
                    </p>
                ) : null}
            </div>

            <div>
                <label className="mb-1 block text-sm font-semibold">
                    Title reading
                    <span className="font-normal text-stone-500"> (optional)</span>
                </label>
                <input
                    value={titleReading}
                    onChange={(event) => onTitleReadingChange(event.target.value)}
                    placeholder="かな reading for the title"
                    className="w-full rounded-xl border border-slate-500 px-4 py-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-semibold">
                    ISBN-13{" "}
                    <span className="font-normal text-stone-500">
                        (optional for manual entry; hyphens are okay)
                    </span>
                </label>
                <input
                    value={isbn13}
                    onChange={(event) => onIsbn13Change(event.target.value)}
                    className="w-full rounded-xl border border-slate-500 px-4 py-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-semibold">
                    Amazon ASIN{" "}
                    <span className="font-normal text-stone-500">
                        (optional; 10 letters/numbers)
                    </span>
                </label>
                <input
                    value={asin}
                    onChange={(event) => onAsinChange(event.target.value)}
                    placeholder="B0D4V5K3M8"
                    className="w-full rounded-xl border border-slate-500 px-4 py-3"
                />
            </div>
        </div>
    );
}
