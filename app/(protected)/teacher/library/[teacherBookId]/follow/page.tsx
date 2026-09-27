// Teacher Follow-Along Reading
//
// Standalone wrapper around the reusable Teacher Follow-Along panel. The panel
// does not write reading sessions, stats or study progress. Explicit prep edits
// use the teacher’s own shared saved vocabulary.

"use client";

import { useParams } from "next/navigation";
import { TeacherFollowAlongPanel } from "./components/TeacherFollowAlongPanel";

export default function TeacherFollowAlongPage() {
  const params = useParams<{ teacherBookId: string }>();
  const teacherBookId = params.teacherBookId;

  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[96rem]">
        <TeacherFollowAlongPanel
          teacherBookId={teacherBookId}
          presentation="standalone"
        />
      </div>
    </main>
  );
}
