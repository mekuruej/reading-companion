import Link from "next/link";

type TeacherBookAddHeaderProps = {
  isEditing: boolean;
  backHref?: string;
};

export function TeacherBookAddHeader({
  isEditing,
  backHref = "/teacher/books",
}: TeacherBookAddHeaderProps) {
  return (
    <header className="mb-8 space-y-3">
      <Link
        href={backHref}
        className="text-sm font-medium text-amber-700 hover:text-amber-800"
      >
        ← Books Needing My Attention
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-stone-900">
          {isEditing ? "Edit shared book" : "Add shared book"}
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-stone-600">
          Create or update a shared catalog book. This does not add the book to
          a student library.
        </p>
      </div>
    </header>
  );
}