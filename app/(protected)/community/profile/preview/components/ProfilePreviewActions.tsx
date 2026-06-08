import Link from "next/link";

type ProfilePreviewActionsProps = {
  settingsHref: string;
};

export default function ProfilePreviewActions({
  settingsHref,
}: ProfilePreviewActionsProps) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
        Not public here
      </div>

      <p className="mt-2 text-sm leading-7 text-stone-600">
        Your email, login details, private notes, saved words, and detailed study history are not shown on this preview.
      </p>

      <div className="mt-4">
        <Link
          href={settingsHref}
          className="inline-flex rounded-2xl bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"
        >
          Edit public details
        </Link>
      </div>
    </section>
  );
}