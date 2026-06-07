type DashboardLoadingCardProps = {
  title?: string;
  message?: string;
};

export default function DashboardLoadingCard({
  title = "Welcome to Mekuru",
  message = "Signing you in...",
}: DashboardLoadingCardProps) {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-6 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {message}
      </p>
    </div>
  );
}