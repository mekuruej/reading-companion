type LessonAlertInput = {
  lessonDay?: string | number | null;
  isTeacherView?: boolean;
  studentName?: string | null;
};

type LessonAlertInfo = {
  title: string;
  message: string;
  alertKey: string;
  kind: "teacher_prepare" | "student_new_readings" | "student_last_chance";
  showBadge: boolean;
  badgeText: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function normalizeLessonDay(value: string | number | null | undefined) {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  if (!value) return null;

  const text = String(value).trim().toLowerCase();
  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) return numeric;

  const index = DAY_NAMES.findIndex((day) => day.toLowerCase() === text);
  return index >= 0 ? index : null;
}

function daysUntil(day: number) {
  const today = new Date().getDay();
  return (day - today + 7) % 7;
}

export function getLessonAlertInfo({
  lessonDay,
  isTeacherView = false,
  studentName,
}: LessonAlertInput): LessonAlertInfo | null {
  const day = normalizeLessonDay(lessonDay);
  if (day === null) return null;

  const daysAway = daysUntil(day);
  const dayName = DAY_NAMES[day];
  const name = studentName || "your student";

  if (isTeacherView) {
    if (daysAway > 2) return null;

    return {
      title: "Prepare lesson readings",
      message: `${name} has a ${dayName} lesson coming up. Check their readings and prepare support notes.`,
      alertKey: `teacher_prepare_${dayName.toLowerCase()}_${daysAway}`,
      kind: "teacher_prepare",
      showBadge: true,
      badgeText: daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway} days`,
    };
  }

  if (daysAway === 0 || daysAway === 1) {
    return {
      title: "Lesson soon",
      message: "Add any new readings or questions before your next lesson.",
      alertKey: `student_last_chance_${dayName.toLowerCase()}_${daysAway}`,
      kind: "student_last_chance",
      showBadge: true,
      badgeText: daysAway === 0 ? "Today" : "Tomorrow",
    };
  }

  if (daysAway <= 4) {
    return {
      title: "Prepare your readings",
      message: "Add the pages or words you want to work through in your next lesson.",
      alertKey: `student_new_readings_${dayName.toLowerCase()}_${daysAway}`,
      kind: "student_new_readings",
      showBadge: true,
      badgeText: `${daysAway} days`,
    };
  }

  return null;
}
