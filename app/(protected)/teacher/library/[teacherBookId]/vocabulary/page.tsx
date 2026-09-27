"use client";
import { useParams } from "next/navigation";
import TeacherVocabularyExperience from "./TeacherVocabularyExperience";
export default function TeacherVocabularyPage() {
  const { teacherBookId } = useParams<{ teacherBookId: string }>();
  return <TeacherVocabularyExperience teacherBookId={teacherBookId} />;
}
