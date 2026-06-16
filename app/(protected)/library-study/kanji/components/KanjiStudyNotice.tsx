type KanjiStudyNoticeProps = {
  notice: string | null;
};

export default function KanjiStudyNotice({ notice }: KanjiStudyNoticeProps) {
  if (!notice) return null;

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900 shadow-sm">
      {notice}
    </div>
  );
}