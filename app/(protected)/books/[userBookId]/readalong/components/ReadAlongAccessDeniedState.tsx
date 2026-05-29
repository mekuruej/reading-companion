import AccessDeniedMessage from "@/components/AccessDeniedMessage";

type ReadAlongAccessDeniedStateProps = {
  message?: string | null;
};

// Access-denied display for the Read Along page.
// page.tsx still owns the access/security decision; this component only renders
// the shared no-access message with the Read Along fallback copy.
export default function ReadAlongAccessDeniedState({
  message,
}: ReadAlongAccessDeniedStateProps) {
  return (
    <AccessDeniedMessage
      message={message || "You do not have access to this book."}
    />
  );
}