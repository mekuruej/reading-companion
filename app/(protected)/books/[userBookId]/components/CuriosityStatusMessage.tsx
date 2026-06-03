type CuriosityStatusMessageProps = {
  message: string;
};

export default function CuriosityStatusMessage({
  message,
}: CuriosityStatusMessageProps) {
  if (!message) return null;

  return (
    <div className="mb-4">
      <p
        className={`text-base font-medium ${
          message.startsWith("❌") ? "text-red-700" : "text-green-700"
        }`}
      >
        {message}
      </p>
    </div>
  );
}