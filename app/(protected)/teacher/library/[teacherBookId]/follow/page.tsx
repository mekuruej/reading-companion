// Teacher Follow-Along Reading
//
// Standalone wrapper around the reusable Teacher Follow-Along panel. The panel
// remains read-only and must not write reading sessions, stats, user_book_words,
// or study progress.

"use client";

import { useParams } from "next/navigation";
import { TeacherFollowAlongPanel } from "./components/TeacherFollowAlongPanel";

export default function TeacherFollowAlongPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId;

  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <TeacherFollowAlongPanel
          teacherBookId={teacherBookId}
          presentation="standalone"
        />
      </div>
    </main>
  );
}
