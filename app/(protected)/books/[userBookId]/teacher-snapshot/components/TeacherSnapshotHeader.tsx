import BookStatsHeader from "../../stats/components/BookStatsHeader";

type TeacherSnapshotHeaderProps = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  statusLabel?: string | null;
  bookHubHref: string;
};

export default function TeacherSnapshotHeader({ title, author, coverUrl, statusLabel, bookHubHref }: TeacherSnapshotHeaderProps) {
  return (
    <BookStatsHeader
      bookTitle={title}
      author={author}
      coverUrl={coverUrl}
      statusLabel={statusLabel}
      bookHubHref={bookHubHref}
      pageLabel="Teacher Snapshot"
      description="Your reading progress, teaching fit, and student activity for this book."
    />
  );
}
