import Link from "next/link";

export type TeacherSnapshotAction = {
  label: string;
  href: string;
  disabled?: boolean;
};

type TeacherSnapshotActionsProps = {
  teacherActions: TeacherSnapshotAction[];
  readerActions: TeacherSnapshotAction[];
};

function ActionLink({ action }: { action: TeacherSnapshotAction }) {
  if (action.disabled) {
    return (
      <span className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-400">
        {action.label}
      </span>
    );
  }

  return (
    <Link
      href={action.href}
      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
    >
      {action.label}
    </Link>
  );
}

export default function TeacherSnapshotActions({
  teacherActions,
  readerActions,
}: TeacherSnapshotActionsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-black text-stone-950">Teacher actions</h3>
        <div className="mt-3 grid gap-2">
          {teacherActions.map((action) => (
            <ActionLink key={action.label} action={action} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-stone-950">Reader actions</h3>
        <div className="mt-3 grid gap-2">
          {readerActions.map((action) => (
            <ActionLink key={action.label} action={action} />
          ))}
        </div>
      </div>
    </div>
  );
}
