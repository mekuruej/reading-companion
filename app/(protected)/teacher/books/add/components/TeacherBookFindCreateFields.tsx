type TeacherBookFindCreateFieldsProps = {
    title: string;
    isbn13: string;
    isBookRequest: boolean;
    titleNeedsManualResearch: boolean;
    onTitleChange: (value: string) => void;
    onIsbn13Change: (value: string) => void;
};

export function TeacherBookFindCreateFields({
    title,
    isbn13,
    isBookRequest,
    titleNeedsManualResearch,
    onTitleChange,
    onIsbn13Change,
}: TeacherBookFindCreateFieldsProps) {
    return (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
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
                    ISBN-13{" "}
                    <span className="font-normal text-stone-500">
                        {isBookRequest ? "(optional for manual entry)" : "*(Hyphens are okay.)"}
                    </span>
                </label>
                <input
                    value={isbn13}
                    onChange={(event) => onIsbn13Change(event.target.value)}
                    className="w-full rounded-xl border border-slate-500 px-4 py-3"
                />
            </div>
        </div>
    );
}