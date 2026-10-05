export type LibraryRelationshipBadge = "Personal Only" | "Teaching Only" | null;

// Personally tracked books default to Both, including books without a relationship.
// Only the explicit teaching workflow status opts a book out of teaching use.
export function getLibraryRelationshipBadge(
  personallyTracked: boolean,
  teachingStatus: string | null | undefined
): LibraryRelationshipBadge {
  if (!personallyTracked) return "Teaching Only";
  return teachingStatus === "not_for_teaching" ? "Personal Only" : null;
}
