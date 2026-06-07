type DashboardBackButtonProps = {
  onBack: () => void;
};

export default function DashboardBackButton({
  onBack,
}: DashboardBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
    >
      Back to MEKURU site
    </button>
  );
}