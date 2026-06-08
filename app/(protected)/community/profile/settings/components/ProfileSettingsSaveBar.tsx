type ProfileSettingsSaveBarProps = {
  saving: boolean;
  onSave: () => void;
};

export default function ProfileSettingsSaveBar({
  saving,
  onSave,
}: ProfileSettingsSaveBarProps) {
  return (
    <div className="sticky bottom-4 z-10 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}