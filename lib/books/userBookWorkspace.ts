import {
  type PersonalTrackingStatus,
  resolvePersonalTrackingStatus,
} from "@/lib/personalTracking";

type SupabaseLike = any;

export async function getOrCreateUserBook({
  supabase,
  userId,
  bookId,
  initialPersonalTrackingStatus = "want_to_read",
  enablePersonalTracking = true,
}: {
  supabase: SupabaseLike;
  userId: string;
  bookId: string;
  initialPersonalTrackingStatus?: PersonalTrackingStatus;
  enablePersonalTracking?: boolean;
}) {
  const { data: existingUserBook, error: existingUserBookError } = await supabase
    .from("user_books")
    .select("id, personal_tracking_status, status, started_at, finished_at, dnf_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existingUserBookError) throw existingUserBookError;

  if (existingUserBook?.id) {
    const existingPersonalStatus = resolvePersonalTrackingStatus(existingUserBook);
    if (enablePersonalTracking && existingPersonalStatus === "not_tracking") {
      const { error: trackingError } = await supabase
        .from("user_books")
        .update({ personal_tracking_status: initialPersonalTrackingStatus })
        .eq("id", existingUserBook.id);

      if (trackingError) throw trackingError;
    }

    return { userBookId: existingUserBook.id as string, alreadyInLibrary: true };
  }

  const { data: insertedUserBook, error: insertUserBookError } = await supabase
    .from("user_books")
    .insert({
      user_id: userId,
      book_id: bookId,
      personal_tracking_status: initialPersonalTrackingStatus,
    })
    .select("id")
    .single();

  if (insertUserBookError?.code === "23505") {
    const { data: racedUserBook, error: racedUserBookError } = await supabase
      .from("user_books")
      .select("id, personal_tracking_status, status, started_at, finished_at, dnf_at")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (racedUserBookError) throw racedUserBookError;
    if (racedUserBook?.id) {
      const racedPersonalStatus = resolvePersonalTrackingStatus(racedUserBook);
      if (enablePersonalTracking && racedPersonalStatus === "not_tracking") {
        const { error: trackingError } = await supabase
          .from("user_books")
          .update({ personal_tracking_status: initialPersonalTrackingStatus })
          .eq("id", racedUserBook.id);

        if (trackingError) throw trackingError;
      }

      return { userBookId: racedUserBook.id as string, alreadyInLibrary: true };
    }
  }

  if (insertUserBookError) throw insertUserBookError;

  return { userBookId: insertedUserBook.id as string, alreadyInLibrary: false };
}

export async function hasValidTeacherOwnedWorkspace({
  supabase,
  teacherId,
  bookId,
  userBookId,
}: {
  supabase: SupabaseLike;
  teacherId: string;
  bookId: string;
  userBookId?: string | null;
}) {
  if (!userBookId) return false;

  const { data: linkedWorkspace, error: linkedWorkspaceError } = await supabase
    .from("user_books")
    .select("id, user_id, book_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (linkedWorkspaceError) throw linkedWorkspaceError;

  return linkedWorkspace?.user_id === teacherId && linkedWorkspace?.book_id === bookId;
}

