import Link from "next/link";

type AccessDeniedMessageProps = {
  message?: string;
  backHref?: string;
  backLabel?: string;
};

export default function AccessDeniedMessage({
  message = "You do not have access to this book.",
  backHref = "/books",
  backLabel = "Back to Books",
}: AccessDeniedMessageProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center">
        <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-stone-700">{message}</p>
          <Link
            href={backHref}
            className="mt-5 inline-flex rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
