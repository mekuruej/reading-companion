type ActorProfile = { role?: string | null; is_super_teacher?: boolean | string | null } | null;

export function isAllUserTeacher(profile: ActorProfile) {
  return profile?.role === "super_teacher" || profile?.is_super_teacher === true || profile?.is_super_teacher === "true";
}

// Call only with the authenticated actor and a server-loaded profile.
// Admin access is explicit because existing callers have different admin policies.
export async function canTeachTargetUser({ supabase, actorId, targetUserId, actorProfile, allowAdmin = false, allowSelf = true }: {
  supabase: any; actorId: string; targetUserId: string; actorProfile: ActorProfile; allowAdmin?: boolean; allowSelf?: boolean;
}) {
  if (allowSelf && actorId === targetUserId) return true;
  if (isAllUserTeacher(actorProfile) || (allowAdmin && actorProfile?.role === "admin")) {
    const { data, error } = await supabase.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  if (actorProfile?.role !== "teacher") return false;
  const { data, error } = await supabase.from("teacher_students").select("teacher_id")
    .eq("teacher_id", actorId).eq("student_id", targetUserId).is("archived_at", null).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
