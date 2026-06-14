import { TeacherPrepShelfEmptyState } from "./TeacherPrepShelfEmptyState";
import { TeacherPrepShelfItemCard } from "./TeacherPrepShelfItemCard";

type TeacherPrepShelfBook = {
  id: string;
  title: string | null;
};

type TeacherPrepShelfListItem = {
  id: string;
  learner_id: string | null;
  status: string;
  notes: string | null;
  books: unknown;
};

type TeacherPrepShelfListProps = {
  items: TeacherPrepShelfListItem[];
  profileNameById: Map<string, string>;
  getPrepBook: (bookRow: unknown) => TeacherPrepShelfBook | null;
  prospectiveLearnerLabel: (notes: string | null) => string;
  onRemovePrepItem: (itemId: string) => void;
};

export function TeacherPrepShelfList({
  items,
  profileNameById,
  getPrepBook,
  prospectiveLearnerLabel,
  onRemovePrepItem,
}: TeacherPrepShelfListProps) {
  if (items.length === 0) {
    return <TeacherPrepShelfEmptyState />;
  }

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      {items.map((item) => {
        const book = getPrepBook(item.books);

        return (
          <TeacherPrepShelfItemCard
            key={item.id}
            itemId={item.id}
            book={book}
            learnerLabel={
              item.learner_id
                ? profileNameById.get(item.learner_id) ?? item.learner_id
                : prospectiveLearnerLabel(item.notes)
            }
            status={item.status}
            onRemove={onRemovePrepItem}
          />
        );
      })}
    </div>
  );
}