type ProfilePreviewHeaderProps = {
  loading: boolean;
  initial: string;
  publicName: string;
  usernameLabel: string;
  targetLanguageLabel: string;
};

export default function ProfilePreviewHeader({
  loading,
  initial,
  publicName,
  usernameLabel,
  targetLanguageLabel,
}: ProfilePreviewHeaderProps) {
  return (
    <>
      <div className="h-28 bg-gradient-to-r from-sky-100 via-amber-50 to-emerald-100" />

      <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-stone-100 text-2xl font-black text-stone-500 shadow-sm">
          {loading ? "..." : initial}
        </div>

        <div className="pb-2">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Public Reader Profile
          </div>

          <h1 className="mt-1 text-3xl font-black text-stone-950">
            {loading ? "Loading preview..." : publicName}
          </h1>

          <p className="mt-1 text-sm text-stone-500">
            {usernameLabel} · {targetLanguageLabel} reader
          </p>
        </div>
      </div>
    </>
  );
}