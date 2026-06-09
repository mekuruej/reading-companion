type KanjiStudyNoCardsStateProps = {
  title?: string;
  message?: string;
};

export default function KanjiStudyNoCardsState({
  title = "No cards for this mode yet",
  message = "Try another study mode or level filter. Some reading directions may have fewer cards until more kanji map data is ready.",
}: KanjiStudyNoCardsStateProps) {
  return (
    <section className="mt-6 w-[90vw] max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center shadow-sm">
      <h2 className="text-lg font-black text-amber-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-amber-800">{message}</p>
    </section>
  );
}