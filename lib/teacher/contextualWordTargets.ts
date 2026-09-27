import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";

type WordTargetActor = { id: string; role?: string | null; is_super_teacher?: boolean | string | null };

export async function loadContextualWordTargets(supabaseAdmin: SupabaseClient, bookId: string, actor: WordTargetActor, linkedStudentIds: Set<string>) {
  const includeTrials = getFeatureAccess({ role: actor.role, isSuperTeacher: actor.is_super_teacher }).isAdmin;
  if (!includeTrials && linkedStudentIds.size === 0) return [];

  let query = supabaseAdmin.from("user_books").select("id, user_id, progress_tracking_method")
    .eq("book_id", bookId).neq("user_id", actor.id).order("created_at", { ascending: true });
  if (!includeTrials) query = query.in("user_id", [...linkedStudentIds]);
  const { data: copies, error: copiesError } = await query;
  if (copiesError) throw copiesError;
  if (!copies?.length) return [];

  const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles")
    .select("id, display_name, username, role, is_super_teacher, app_access_type, app_access_expires_at")
    .in("id", [...new Set(copies.map(copy => copy.user_id))]);
  if (profilesError) throw profilesError;
  const profilesById = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  const seen = new Set<string>();
  return copies.flatMap(copy => {
    const profile = profilesById.get(copy.user_id);
    if (seen.has(copy.user_id) || (!linkedStudentIds.has(copy.user_id) &&
      !(includeTrials && profile && getAppAccessStatus(profile).isTrialActive))) return [];
    seen.add(copy.user_id);
    return [{ studentId: copy.user_id, studentUserBookId: copy.id,
      studentName: profile?.display_name || profile?.username || "Student",
      positionUnit: copy.progress_tracking_method ?? "page" }];
  }).sort((a, b) => a.studentName.localeCompare(b.studentName));
}

