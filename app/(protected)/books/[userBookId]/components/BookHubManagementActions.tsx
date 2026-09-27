type Props = {
  canRemove: boolean;
  teachingOnly: boolean;
  saving: boolean;
  error: string | null;
  onFlag: () => void;
  onRemove: () => void;
  onMoveToLibrary: () => void;
};

export default function BookHubManagementActions({ canRemove, teachingOnly, saving, error, onFlag, onRemove, onMoveToLibrary }: Props) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-center">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onFlag} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">Flag a problem</button>
        {canRemove && teachingOnly ? (
          <button type="button" onClick={onMoveToLibrary} disabled={saving} className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50">
            {saving ? "Moving..." : "Move to My Library"}
          </button>
        ) : null}
        {canRemove ? (
          <button type="button" onClick={onRemove} disabled={saving} className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
            {teachingOnly ? "Remove book" : "Remove from My Library"}
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
