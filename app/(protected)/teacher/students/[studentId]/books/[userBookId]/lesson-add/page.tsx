"use client";

import { useParams, useSearchParams } from "next/navigation";
import LiveLessonQuickAddPanel from "./LiveLessonQuickAddPanel";

export default function LiveLessonAddWordPage() {
  const params = useParams<{ studentId: string; userBookId: string }>();
  const searchParams = useSearchParams();
  const studentId = params.studentId ?? "";
  const userBookId = params.userBookId ?? "";

  return (
    <LiveLessonQuickAddPanel
      key={`${studentId}:${userBookId}:${searchParams.get("sourceUserBookId") ?? ""}:${searchParams.get("sessionId") ?? ""}`}
      studentId={studentId}
      userBookId={userBookId}
      requestedSessionId={searchParams.get("sessionId") ?? ""}
      sourceUserBookId={searchParams.get("sourceUserBookId") ?? ""}
      fromStudentWorkspace={
        searchParams.get("from") === "student-workspace" &&
        searchParams.get("studentId") === studentId
      }
      embedded={searchParams.get("embedded") === "combined-lesson"}
    />
  );
}
