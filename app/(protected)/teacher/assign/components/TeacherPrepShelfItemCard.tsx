import Link from "next/link";

type TeacherPrepShelfBook = {
  id: string;
  title: string | null;
};

type TeacherPrepShelfItemCardProps = {
  itemId: string;
  book: TeacherPrepShelfBook | null;
  learnerLabel: string;
  status: string;
  onRemove: (itemId: string) => void;
};

export function TeacherPrepShelfItemCard({
  itemId,
  book,
  learnerLabel,
  status,
  onRemove,
}: TeacherPrepShelfItemCardProps) {
  return (
    <article
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.8)",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontWeight: 850 }}>{book?.title ?? "Untitled"}</div>
        <div style={{ marginTop: 4, color: "#78716c", fontSize: 13 }}>
          {learnerLabel} · {status}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {book ? (
          <Link
            href={`/teacher/books/add?bookId=${book.id}`}
            style={{
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: 12,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#292524",
              background: "white",
              fontWeight: 750,
            }}
          >
            Edit book info
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => onRemove(itemId)}
          style={{
            border: "1px solid rgba(185,28,28,0.28)",
            borderRadius: 12,
            padding: "8px 12px",
            color: "#991b1b",
            background: "rgba(254,242,242,0.9)",
            fontWeight: 750,
            cursor: "pointer",
          }}
        >
          Remove from Prep Shelf
        </button>
      </div>
    </article>
  );
}