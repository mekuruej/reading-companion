type ProfilePreviewErrorStateProps = {
  message: string;
};

export default function ProfilePreviewErrorState({
  message,
}: ProfilePreviewErrorStateProps) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}