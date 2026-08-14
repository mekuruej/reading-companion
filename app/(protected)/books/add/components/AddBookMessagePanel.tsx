type AddBookMessagePanelProps = {
  message: string;
};

export default function AddBookMessagePanel({
  message,
}: AddBookMessagePanelProps) {
  if (!message) return null;

  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      <p>{message}</p>
    </div>
  );
}
