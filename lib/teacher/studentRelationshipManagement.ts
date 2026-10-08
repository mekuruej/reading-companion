export type TeacherStudentRelationship = {
  teacher_id: string;
  student_id: string;
  archived_at: string | null;
};

export type TeacherStudentRelationshipStore = {
  find(teacherId: string, studentId: string): Promise<TeacherStudentRelationship | null>;
  insert(teacherId: string, studentId: string): Promise<void>;
  reactivate(teacherId: string, studentId: string): Promise<void>;
};

export async function ensureTeacherStudentRelationship({
  store,
  teacherId,
  studentId,
}: {
  store: TeacherStudentRelationshipStore;
  teacherId: string;
  studentId: string;
}) {
  const existing = await store.find(teacherId, studentId);
  if (existing && existing.archived_at == null) {
    return { created: false, reactivated: false };
  }

  if (existing) {
    await store.reactivate(teacherId, studentId);
    return { created: false, reactivated: true };
  }

  try {
    await store.insert(teacherId, studentId);
    return { created: true, reactivated: false };
  } catch (error) {
    // A concurrent request may have inserted the unique teacher/student pair.
    if ((error as { code?: string } | null)?.code !== "23505") throw error;
    const raced = await store.find(teacherId, studentId);
    if (!raced) throw error;
    if (raced.archived_at == null) return { created: false, reactivated: false };
    await store.reactivate(teacherId, studentId);
    return { created: false, reactivated: true };
  }
}
