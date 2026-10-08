import {
  TEACHING_STATUSES,
  type TeachingStatus,
  teachingStatusLabel,
} from "@/lib/teachingStatus";

type BookHubTeachingOverviewProps = {
  status: TeachingStatus | "";
  saving: boolean;
  message: string | null;
  error: string | null;
  onStatusChange: (value: TeachingStatus | "") => void;
  onSave: () => void;
};

export default function BookHubTeachingOverview({
  status,
  saving,
  message,
  error,
  onStatusChange,
  onSave,
}: BookHubTeachingOverviewProps) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="mb-3 text-sm font-semibold text-stone-900">
        Teaching Status
      </div>

      <div className="space-y-3 text-sm text-stone-700">
        <label className="block">
          <span className="mb-1 block font-medium">Teaching Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as TeachingStatus | "")}
            disabled={saving}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm disabled:bg-stone-100"
          >
            <option value="">{teachingStatusLabel(null)}</option>
            {TEACHING_STATUSES.map((option) => (
              <option key={option} value={option}>
                {teachingStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Teaching Status"}
        </button>

        <div className="rounded-xl border border-blue-100 bg-white/75 px-3 py-2">
          <div>
            <span className="font-medium">Current status:</span>{" "}
            {teachingStatusLabel(status || null)}
          </div>
        </div>

        {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
