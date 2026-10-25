type ProfileSettingsSaveBarProps = {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export default function ProfileSettingsSaveBar({
  saving,
  onSave,
  onCancel,
}: ProfileSettingsSaveBarProps) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-xl bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
