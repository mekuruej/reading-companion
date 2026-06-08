type DictionaryErrorMessageProps = {
  message: string | null;
};

export default function DictionaryErrorMessage({
  message,
}: DictionaryErrorMessageProps) {
  if (!message) return null;

  return <p className="mb-3 text-sm text-red-600">{message}</p>;
}