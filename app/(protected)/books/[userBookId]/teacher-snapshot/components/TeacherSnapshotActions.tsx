import Link from "next/link";

export type TeacherSnapshotAction = {
  label: string;
  href: string;
  disabled?: boolean;
  buttonTone?: "primary" | "secondary";
  onClick?: () => void;
};

type TeacherSnapshotActionsProps = {
  primaryAction: TeacherSnapshotAction | null;
  teacherActions: TeacherSnapshotAction[];
  readerActions: TeacherSnapshotAction[];
};

function ActionLink({
  action,
  primary = false,
}: {
  action: TeacherSnapshotAction;
  primary?: boolean;
}) {
  const baseClass = primary
    ? "inline-flex items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
    : "inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";

  if (action.onClick) {
    return (
      <button
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className={baseClass}
      >
        {action.label}
      </button>
    );
  }

  if (action.disabled) {
    return (
      <span className={baseClass.replace("bg-white", "bg-stone-100").replace("text-stone-700", "text-stone-400")}>
        {action.label}
      </span>
    );
  }

  return (
    <Link
      href={action.href}
      className={baseClass}
    >
      {action.label}
    </Link>
  );
}

export default function TeacherSnapshotActions({
  primaryAction,
  teacherActions,
  readerActions,
}: TeacherSnapshotActionsProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      {primaryAction ? <ActionLink action={primaryAction} primary /> : null}

      {readerActions.length > 0 ? (
        <div className="flex flex-col items-start gap-2">
          <span className="px-1 text-xs font-black uppercase tracking-[0.12em] text-stone-400">
            Reader Tools
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {readerActions.map((action) => (
              <ActionLink key={action.label} action={action} />
            ))}
          </div>
        </div>
      ) : null}

      {teacherActions.length > 0 ? (
        <div className="flex flex-col items-start gap-2">
          <span className="px-1 text-xs font-black uppercase tracking-[0.12em] text-stone-400">
            Teacher Tools
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {teacherActions.map((action) => (
              <ActionLink key={action.label} action={action} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
