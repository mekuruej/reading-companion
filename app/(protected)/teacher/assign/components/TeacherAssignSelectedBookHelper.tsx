import Link from "next/link";

type TeacherAssignSelectedBook = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  publisher: string | null;
  book_type: string | null;
};

type TeacherAssignSelectedBookHelperProps = {
  selectedBook: TeacherAssignSelectedBook | undefined;
  missingInfo: string[];
};

export function TeacherAssignSelectedBookHelper({
  selectedBook,
  missingInfo,
}: TeacherAssignSelectedBookHelperProps) {
  if (!selectedBook) {
    return null;
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.1)",
        padding: 12,
        background: "rgba(255,255,255,0.72)",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div>
        <b>Selected:</b> {selectedBook.title ?? "Untitled"}
        {selectedBook.author ? ` — ${selectedBook.author}` : ""}
      </div>

      {missingInfo.length > 0 ? (
        <div style={{ marginTop: 6, color: "#92400e" }}>
          Missing book info: {missingInfo.join(", ")}.{" "}
          <Link href={`/teacher/books/add?bookId=${selectedBook.id}`}>
            Edit book info
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 6, color: "#166534" }}>
          Core book info looks complete.{" "}
          <Link href={`/teacher/books/add?bookId=${selectedBook.id}`}>
            Edit book info
          </Link>
        </div>
      )}
    </div>
  );
}