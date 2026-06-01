type BookHubNoticesProps = {
  error: string | null;
  hideError: boolean;
  saveNotice: string | null;
  saveNoticeTone: "success" | "warning";
};

export default function BookHubNotices({
  error,
  hideError,
  saveNotice,
  saveNoticeTone,
}: BookHubNoticesProps) {
  return (
    <>
      {error && !hideError ? (
        <div className="border-t border-stone-200 px-5 py-3 text-sm text-red-600 md:px-8">
          {error}
        </div>
      ) : null}

      {saveNotice ? (
        <div
          className={`border-t border-stone-200 px-5 py-3 text-sm md:px-8 ${
            saveNoticeTone === "warning" ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {saveNotice}
        </div>
      ) : null}
    </>
  );
}