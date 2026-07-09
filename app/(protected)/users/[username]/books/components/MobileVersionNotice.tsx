import { useState } from "react";

type MobileVersionNoticeProps = {
  title?: string;
  body?: string;
};

export default function MobileVersionNotice({
  title = "You’re using the iPhone version of MEKURU",
  body = "Reading, listening, Follow-Along, flashcards, and library updates are available here. Teacher tools and editing tools are available on computer.",
}: MobileVersionNoticeProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className="mb-5 rounded-3xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm md:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-sky-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
        </div>

        <button
          type="button"
          onClick={() => setHidden(true)}
          className="self-start rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
        >
          Hide
        </button>
      </div>
    </div>
  );
}

export function DesktopOnlyNotice({
  message = "This tool is available on computer.",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-600 shadow-sm md:hidden">
      {message}
    </div>
  );
}
