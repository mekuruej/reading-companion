type TeacherAssignBookOption = {
  id: string;
  title: string | null;
  author: string | null;
};

type TeacherAssignBookPickerProps = {
  bookSearch: string;
  bookId: string;
  booksCount: number;
  filteredBooks: TeacherAssignBookOption[];
  onBookSearchChange: (value: string) => void;
  onBookChange: (id: string) => void;
};

export function TeacherAssignBookPicker({
  bookSearch,
  bookId,
  booksCount,
  filteredBooks,
  onBookSearchChange,
  onBookChange,
}: TeacherAssignBookPickerProps) {
  return (
    <>
      <input
        value={bookSearch}
        onChange={(event) => onBookSearchChange(event.target.value)}
        placeholder="Search title, author, ISBN, publisher, or book type"
        style={{
          border: "1px solid rgba(0,0,0,0.18)",
          borderRadius: 12,
          padding: "10px 12px",
        }}
      />

      <select value={bookId} onChange={(event) => onBookChange(event.target.value)}>
        {filteredBooks.map((book) => (
          <option key={book.id} value={book.id}>
            {book.title ?? "Untitled"}
            {book.author ? ` — ${book.author}` : ""}
          </option>
        ))}
      </select>

      <div style={{ opacity: 0.65, fontSize: 12 }}>
        {filteredBooks.length === booksCount
          ? `${booksCount} books available.`
          : `${filteredBooks.length} of ${booksCount} books match.`}
      </div>
    </>
  );
}