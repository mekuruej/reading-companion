type KanjiStudyHeaderProps = {
  title?: string;
};

export default function KanjiStudyHeader({
  title = "Kanji Reading Study",
}: KanjiStudyHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-3xl shadow-sm">
        漢
      </div>

      <h1 className="text-center text-2xl font-semibold text-slate-950">
        {title}
      </h1>
    </div>
  );
}
