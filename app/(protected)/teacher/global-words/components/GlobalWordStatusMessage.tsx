"use client";

type Props = {
  message: string;
};

export default function GlobalWordStatusMessage({ message }: Props) {
  if (!message) return null;

  const isError = message.startsWith("❌");
  const isSuccess = message.startsWith("✅");

  return (
    <div className="mt-4">
      <p
        className={`text-sm font-medium ${
          isError
            ? "text-red-700"
            : isSuccess
              ? "text-emerald-700"
              : "text-amber-700"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
