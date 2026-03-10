export type LessonAlertKind =
  | "teacher_prepare"
  | "student_new_readings"
  | "student_last_chance";

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalizeLessonDay(day: string | null | undefined): string | null {
  if (!day) return null;
  const cleaned = day.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DAY_INDEX, cleaned) ? cleaned : null;
}

function getTodayIndex(): number {
  return new Date().getDay();
}

function getDateStamp(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getLessonAlertInfo(params: {
  lessonDay: string | null | undefined;
  isTeacherView: boolean;
  studentName?: string | null;
}) {
  const normalizedLessonDay = normalizeLessonDay(params.lessonDay);
  if (!normalizedLessonDay) return null;

  const lessonIdx = DAY_INDEX[normalizedLessonDay];
  const todayIdx = getTodayIndex();

  const teacherPrepIdx = (lessonIdx + 1) % 7;
  const studentNewIdx = (lessonIdx + 2) % 7;
  const studentLastChanceIdx = (lessonIdx + 6) % 7; // day before lesson

  const dateStamp = getDateStamp();

  if (params.isTeacherView) {
    if (todayIdx !== teacherPrepIdx) return null;

    const studentLabel = params.studentName?.trim() || "this student";

    return {
      kind: "teacher_prepare" as LessonAlertKind,
      title: "📚 TEACHER REMINDER",
      message: `Prepare next week’s readings for ${studentLabel}.`,
      alertKey: `teacher_prepare:${dateStamp}:${normalizedLessonDay}:${studentLabel}`,
      showBadge: false,
      badgeText: null,
    };
  }

  if (todayIdx === studentNewIdx) {
    return {
      kind: "student_new_readings" as LessonAlertKind,
      title: "🆕 NEW READINGS",
      message:
        "Your new kanji readings for next week’s lesson are ready.\nRegular review will help you build confidence and stronger reading skills over time.",
      alertKey: `student_new_readings:${dateStamp}:${normalizedLessonDay}`,
      showBadge: true,
      badgeText: "NEW",
    };
  }

  if (todayIdx === studentLastChanceIdx) {
    return {
      kind: "student_last_chance" as LessonAlertKind,
      title: "⚠ LAST CHANCE!",
      message:
        "Lesson tomorrow! A quick review today will make the reading feel lighter.",
      alertKey: `student_last_chance:${dateStamp}:${normalizedLessonDay}`,
      showBadge: true,
      badgeText: "LAST CHANCE",
    };
  }

  return null;
}