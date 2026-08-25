type TeacherGlobalDestination = "catalog_only" | "student_only" | "teacher_and_student";

type AddBookTeacherDestinationOptionsProps = {
  teacherDestination: TeacherGlobalDestination;
  canUseCatalogOnly: boolean;
  onSelect: (destination: TeacherGlobalDestination) => void;
};

const TEACHER_DESTINATION_OPTIONS: Array<{
  value: TeacherGlobalDestination;
  title: string;
  helper: string;
}> = [
  {
    value: "catalog_only",
    title: "MEKURU Catalog",
    helper: "Create this edition without adding it to a personal Library.",
  },
  {
    value: "student_only",
    title: "Student's Library",
    helper: "Add this edition to one student's Library.",
  },
  {
    value: "teacher_and_student",
    title: "My Library + Student's Library",
    helper: "Add this edition to your Library and the student's Library.",
  },
];

export default function AddBookTeacherDestinationOptions({
  teacherDestination,
  canUseCatalogOnly,
  onSelect,
}: AddBookTeacherDestinationOptionsProps) {
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-3">
      {TEACHER_DESTINATION_OPTIONS.map((option) => {
        const selected = teacherDestination === option.value;
        const disabled = option.value === "catalog_only" && !canUseCatalogOnly;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={[
              "rounded-2xl border p-4 text-left transition",
              disabled ? "cursor-not-allowed opacity-50" : "",
              selected
                ? "border-stone-900 bg-white shadow-sm"
                : "border-stone-200 bg-white/70 hover:bg-white",
            ].join(" ")}
          >
            <span className="block text-sm font-black text-stone-950">
              {option.title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-stone-600">
              {option.helper}
              {disabled ? " Super teacher access is required." : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
