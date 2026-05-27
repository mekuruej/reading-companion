const PACE_LEGEND_ITEMS = [
  {
    label: "Flowing",
    color: "bg-emerald-400",
    text: "These books moved quickly page by page.",
  },
  {
    label: "Steady",
    color: "bg-sky-400",
    text: "Comfortably readable, but still asking for attention.",
  },
  {
    label: "Support-heavy",
    color: "bg-amber-400",
    text: "These books took noticeably more time per page.",
  },
  {
    label: "Pushes back",
    color: "bg-red-400",
    text: "These books asked for a lot of support.",
  },
];

export default function PaceLegendCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PACE_LEGEND_ITEMS.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${item.color}`} />
            <div className="font-semibold text-slate-900">{item.label}</div>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-600">{item.text}</p>
        </div>
      ))}
    </div>
  );
}