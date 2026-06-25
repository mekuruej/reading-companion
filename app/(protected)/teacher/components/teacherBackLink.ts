export type TeacherBackLink = {
  href: string;
  label: string;
};

export function getTeacherBackLink(source: string | null | undefined): TeacherBackLink {
  if (source === "lesson-prep") {
    return { href: "/teacher/lesson-prep", label: "← Lesson Prep" };
  }

  if (source === "needs-attention") {
    return { href: "/teacher/needs-attention", label: "← Needs Attention" };
  }

  if (source === "site-upkeep") {
    return { href: "/teacher/general-upkeep", label: "← Site Upkeep" };
  }

  return { href: "/teacher", label: "← Teacher Hub" };
}
