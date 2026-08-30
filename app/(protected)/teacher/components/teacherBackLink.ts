export type TeacherBackLink = {
  href: string;
  label: string;
};

export function getTeacherBackLink(source: string | null | undefined): TeacherBackLink {
  if (source === "lesson-prep") {
    return { href: "/teacher/lesson-prep", label: "← Back to Lesson Prep" };
  }

  if (source === "needs-attention") {
    return { href: "/teacher/needs-attention", label: "← Back to Needs Attention" };
  }

  if (source === "site-upkeep") {
    return { href: "/teacher/general-upkeep", label: "← Back to Site Upkeep" };
  }

  if (source === "teacher-books") {
    return { href: "/teacher/books", label: "← Back to Teaching Books" };
  }

  if (source === "teacher-library") {
    return { href: "/teacher/library", label: "← Back to Teaching Books" };
  }

  return { href: "/teacher", label: "← Back to Teacher Hub" };
}
