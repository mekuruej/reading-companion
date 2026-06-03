type LibraryEmptyStateProps = {
  message?: string;
};

export default function LibraryEmptyState({
  message = "No books yet.",
}: LibraryEmptyStateProps) {
  return <div className="mt-8 text-sm text-gray-600">{message}</div>;
}