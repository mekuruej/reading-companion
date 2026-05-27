type BulkMessageBannerProps = {
  message: string;
};

export default function BulkMessageBanner({ message }: BulkMessageBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-4">
      {message.startsWith("❌") ? (
        <p className="text-base font-medium text-red-700">{message}</p>
      ) : (
        <p className="text-lg font-semibold text-green-700">{message}</p>
      )}
    </div>
  );
}