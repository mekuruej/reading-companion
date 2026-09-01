type AddBookTeacherDestinationOptionsProps = {
  canUseCatalogOnly: boolean;
  addToCatalogOnly: boolean;
  addToTeachingBooks: boolean;
  addToMyLibrary: boolean;
  addToStudentLibrary: boolean;
  onCatalogOnlyChange: (checked: boolean) => void;
  onTeachingBooksChange: (checked: boolean) => void;
  onMyLibraryChange: (checked: boolean) => void;
  onStudentLibraryChange: (checked: boolean) => void;
};

const TEACHER_DESTINATION_OPTIONS = [
  {
    key: "catalogOnly",
    title: "MEKURU Catalog only",
    helper: "Create or reuse the shared catalog record without adding it anywhere.",
  },
  {
    key: "teachingBooks",
    title: "My Teaching Books",
    helper: "Create or reuse the teaching workspace and mark it Currently Teaching.",
  },
  {
    key: "myLibrary",
    title: "My Library",
    helper: "Save this edition to your personal reading Library.",
  },
  {
    key: "studentLibrary",
    title: "Student's Library",
    helper: "Add this edition to one linked student's Library.",
  },
] as const;

export default function AddBookTeacherDestinationOptions({
  canUseCatalogOnly,
  addToCatalogOnly,
  addToTeachingBooks,
  addToMyLibrary,
  addToStudentLibrary,
  onCatalogOnlyChange,
  onTeachingBooksChange,
  onMyLibraryChange,
  onStudentLibraryChange,
}: AddBookTeacherDestinationOptionsProps) {
  const checkedByKey = {
    catalogOnly: addToCatalogOnly,
    teachingBooks: addToTeachingBooks,
    myLibrary: addToMyLibrary,
    studentLibrary: addToStudentLibrary,
  };
  const changeByKey = {
    catalogOnly: onCatalogOnlyChange,
    teachingBooks: onTeachingBooksChange,
    myLibrary: onMyLibraryChange,
    studentLibrary: onStudentLibraryChange,
  };

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-3">
      {TEACHER_DESTINATION_OPTIONS.map((option) => {
        if (option.key === "catalogOnly" && !canUseCatalogOnly) return null;

        const selected = checkedByKey[option.key];
        const disabled = addToCatalogOnly && option.key !== "catalogOnly";

        return (
          <label
            key={option.key}
            className={[
              "flex gap-3 rounded-2xl border p-4 text-left transition",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              selected
                ? "border-sky-300 bg-sky-50 shadow-sm"
                : "border-stone-200 bg-white/70 hover:bg-white",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={disabled}
              onChange={(event) => changeByKey[option.key](event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
            />
            <span>
              <span className="block text-sm font-black text-stone-950">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-600">
                {option.helper}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
