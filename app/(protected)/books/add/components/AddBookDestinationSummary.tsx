type DestinationKind = "self" | "student" | "user";

type AddBookDestinationSummaryProps = {
  destinationKind: DestinationKind;
  displayName?: string | null;
  contextDescription?: string | null;
};

function destinationTitle(destinationKind: DestinationKind, displayName?: string | null) {
  if (destinationKind === "self") return "Adding to My Library";

  const name = displayName?.trim();
  if (name) return `Adding to ${name}'s Library`;

  if (destinationKind === "student") return "Adding to this student's Library";
  return "Adding to this user's Library";
}

function destinationDescription(destinationKind: DestinationKind) {
  if (destinationKind === "self") {
    return "This book will be saved to your own reading library.";
  }

  if (destinationKind === "student") {
    return "This destination came from the student context that opened Add Book.";
  }

  return "This destination came from the user context that opened Add Book.";
}

export default function AddBookDestinationSummary({
  destinationKind,
  displayName,
  contextDescription,
}: AddBookDestinationSummaryProps) {
  return (
    <section className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
        Destination
      </p>
      <h2 className="mt-1 text-base font-black text-stone-950">
        {destinationTitle(destinationKind, displayName)}
      </h2>
      <p className="mt-1 text-xs leading-5 text-sky-900">
        {destinationDescription(destinationKind)}
      </p>
      {contextDescription ? (
        <p className="mt-1 text-xs font-semibold leading-5 text-sky-950">
          {contextDescription}
        </p>
      ) : null}
    </section>
  );
}
