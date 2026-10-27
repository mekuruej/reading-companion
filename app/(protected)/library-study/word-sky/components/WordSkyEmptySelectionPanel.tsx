export default function WordSkyEmptySelectionPanel() {
  return (
    <div>
      <div className="text-sm font-semibold text-[var(--appearance-text)]">
        Tap a floating word.
      </div>

      <p className="mt-1 text-sm leading-6 text-[var(--appearance-muted-text)]">
        Claimed words stay separate from real reading encounters.
      </p>
    </div>
  );
}