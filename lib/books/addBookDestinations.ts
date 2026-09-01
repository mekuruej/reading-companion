import {
  type PersonalTrackingStatus,
  resolvePersonalTrackingStatus,
} from "@/lib/personalTracking";

function isMissingColumnError(error: any) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

type SupabaseLike = any;

export type AddBookActorProfile = {
  role?: string | null;
  is_super_teacher?: boolean | string | null;
} | null;

export type AddBookDestinationInput = {
  mode?: string | null;
  destinations?: {
    catalogOnly?: boolean;
    myLibrary?: boolean;
    teachingBooks?: boolean;
    studentLibrary?: boolean;
  } | null;
  targetUserId?: string | null;
  context?: string | null;
  studentId?: string | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isTeacherProfile(profile: AddBookActorProfile) {
  return (
    profile?.role === "teacher" ||
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function isElevatedCatalogUser(profile: AddBookActorProfile) {
  return (
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function canAddToTargetUser({
  supabase,
  actorId,
  targetUserId,
  actorProfile,
}: {
  supabase: SupabaseLike;
  actorId: string;
  targetUserId: string;
  actorProfile: AddBookActorProfile;
}) {
  if (actorId === targetUserId) return true;

  if (isElevatedCatalogUser(actorProfile)) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  if (actorProfile?.role !== "teacher") return false;

  const { data, error } = await supabase
    .from("teacher_students")
    .select("teacher_id")
    .eq("teacher_id", actorId)
    .eq("student_id", targetUserId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function getOrCreateUserBook({
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

async function hasValidTeacherOwnedWorkspace({
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

async function getOrCreateTeacherBook({
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
  const { data: existingTeacherBook, error: existingTeacherBookError } = await supabase
    .from("teacher_books")
    .select("id, user_book_id, teaching_status")
    .eq("teacher_id", teacherId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existingTeacherBookError) {
    if (isMissingColumnError(existingTeacherBookError)) {
      throw new Error("The pending teaching status migration must be applied before adding to My Teaching Books.");
    }
    throw existingTeacherBookError;
  }

  if (existingTeacherBook?.id) {
    let hasValidLinkedWorkspace = await hasValidTeacherOwnedWorkspace({
      supabase,
      teacherId,
      bookId,
      userBookId: existingTeacherBook.user_book_id,
    });

    const shouldRelinkWorkspace =
      Boolean(userBookId) &&
      (!existingTeacherBook.user_book_id || !hasValidLinkedWorkspace);

    if (shouldRelinkWorkspace) {
      const { error: linkError } = await supabase
        .from("teacher_books")
        .update({ user_book_id: userBookId })
        .eq("id", existingTeacherBook.id);

      if (linkError) throw linkError;
      hasValidLinkedWorkspace = true;
    }

    const alreadyCurrentlyTeaching =
      hasValidLinkedWorkspace &&
      existingTeacherBook.teaching_status === "currently_teaching";

    const { error: teachingStatusError } = await supabase
      .from("teacher_books")
      .update({ teaching_status: "currently_teaching" })
      .eq("id", existingTeacherBook.id);

    if (teachingStatusError) {
      if (isMissingColumnError(teachingStatusError)) {
        throw new Error("The pending teaching status migration must be applied before adding to My Teaching Books.");
      }
      throw teachingStatusError;
    }

    return {
      teacherBookId: existingTeacherBook.id as string,
      alreadyInTeachingBooks: alreadyCurrentlyTeaching,
      alreadyCurrentlyTeaching,
    };
  }

  const { data: insertedTeacherBook, error: insertTeacherBookError } = await supabase
    .from("teacher_books")
    .insert({
      teacher_id: teacherId,
      book_id: bookId,
      user_book_id: userBookId ?? null,
      teaching_status: "currently_teaching",
    })
    .select("id")
    .single();

  if (insertTeacherBookError?.code === "23505") {
    const { data: racedTeacherBook, error: racedTeacherBookError } = await supabase
      .from("teacher_books")
      .select("id, user_book_id, teaching_status")
      .eq("teacher_id", teacherId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (racedTeacherBookError) throw racedTeacherBookError;
    if (racedTeacherBook?.id) {
      let hasValidLinkedWorkspace = await hasValidTeacherOwnedWorkspace({
        supabase,
        teacherId,
        bookId,
        userBookId: racedTeacherBook.user_book_id,
      });
      const shouldRelinkWorkspace =
        Boolean(userBookId) &&
        (!racedTeacherBook.user_book_id || !hasValidLinkedWorkspace);

      if (shouldRelinkWorkspace) {
        const { error: linkError } = await supabase
          .from("teacher_books")
          .update({ user_book_id: userBookId })
          .eq("id", racedTeacherBook.id);

        if (linkError) throw linkError;
        hasValidLinkedWorkspace = true;
      }

      const alreadyCurrentlyTeaching =
        hasValidLinkedWorkspace && racedTeacherBook.teaching_status === "currently_teaching";
      const { error: teachingStatusError } = await supabase
        .from("teacher_books")
        .update({ teaching_status: "currently_teaching" })
        .eq("id", racedTeacherBook.id);

      if (teachingStatusError) {
        if (isMissingColumnError(teachingStatusError)) {
          throw new Error("The pending teaching status migration must be applied before adding to My Teaching Books.");
        }
        throw teachingStatusError;
      }

      return {
        teacherBookId: racedTeacherBook.id as string,
        alreadyInTeachingBooks: alreadyCurrentlyTeaching,
        alreadyCurrentlyTeaching,
      };
    }
  }

  if (insertTeacherBookError) {
    if (isMissingColumnError(insertTeacherBookError)) {
      throw new Error("The pending teaching status migration must be applied before adding to My Teaching Books.");
    }
    throw insertTeacherBookError;
  }

  return {
    teacherBookId: insertedTeacherBook.id as string,
    alreadyInTeachingBooks: false,
    alreadyCurrentlyTeaching: false,
  };
}

function parseDestinations({
  authUserId,
  actorProfile,
  input,
}: {
  authUserId: string;
  actorProfile: AddBookActorProfile;
  input: AddBookDestinationInput;
}) {
  const targetUserId = cleanId(input.targetUserId);
  const rawDestinations = input.destinations;
  const isTeacher = isTeacherProfile(actorProfile);

  if (rawDestinations && typeof rawDestinations === "object") {
    const catalogOnly = isElevatedCatalogUser(actorProfile) && rawDestinations.catalogOnly === true;
    const myLibrary = !isTeacher ? true : rawDestinations.myLibrary === true;
    const teachingBooks = !catalogOnly && isTeacher && rawDestinations.teachingBooks === true;
    const studentLibrary = !catalogOnly && isTeacher && rawDestinations.studentLibrary === true;

    if (rawDestinations.catalogOnly === true && !catalogOnly) {
      const error = new Error("Only super teachers and admins can add to the MEKURU Catalog only.");
      (error as any).status = 403;
      throw error;
    }

    if (catalogOnly && (rawDestinations.myLibrary || rawDestinations.teachingBooks || rawDestinations.studentLibrary)) {
      const error = new Error("MEKURU Catalog only cannot be combined with Library or Teaching Books destinations.");
      (error as any).status = 400;
      throw error;
    }

    if (!catalogOnly && !myLibrary && !teachingBooks && !studentLibrary) {
      const error = new Error("Choose at least one place to add this book.");
      (error as any).status = 400;
      throw error;
    }

    if (studentLibrary && !targetUserId) {
      const error = new Error("Choose a student before adding this book.");
      (error as any).status = 400;
      throw error;
    }

    return {
      catalogOnly,
      myLibrary,
      teachingBooks,
      studentLibrary,
      targetUserId,
    };
  }

  if (input.mode === "global_only") {
    return {
      catalogOnly: true,
      myLibrary: false,
      teachingBooks: false,
      studentLibrary: false,
      targetUserId: "",
    };
  }

  if (input.mode === "teacher_and_student") {
    return {
      catalogOnly: false,
      myLibrary: true,
      teachingBooks: false,
      studentLibrary: true,
      targetUserId,
    };
  }

  const legacyTargetUserId = targetUserId || authUserId;

  return {
    catalogOnly: false,
    myLibrary: legacyTargetUserId === authUserId,
    teachingBooks: false,
    studentLibrary: legacyTargetUserId !== authUserId,
    targetUserId: legacyTargetUserId,
  };
}

export async function applyAddBookDestinations({
  supabase,
  authUserId,
  actorProfile,
  bookId,
  input,
  createStudentLessonBook,
}: {
  supabase: SupabaseLike;
  authUserId: string;
  actorProfile: AddBookActorProfile;
  bookId: string;
  input: AddBookDestinationInput;
  createStudentLessonBook?: (userBookId: string) => Promise<unknown>;
}) {
  const destinations = parseDestinations({ authUserId, actorProfile, input });
  const isStudentLessonBookContext = input.context === "student-lesson-book";
  const lessonStudentId = cleanId(input.studentId);

  if (isStudentLessonBookContext && (!lessonStudentId || destinations.targetUserId !== lessonStudentId)) {
    const error = new Error("Student lesson book context is incomplete.");
    (error as any).status = 400;
    throw error;
  }

  if (isStudentLessonBookContext && (destinations.catalogOnly || destinations.myLibrary || destinations.teachingBooks)) {
    const error = new Error("Student lesson book context cannot use this add mode.");
    (error as any).status = 400;
    throw error;
  }

  if (destinations.catalogOnly) {
    if (!isElevatedCatalogUser(actorProfile)) {
      const error = new Error("Only super teachers can create global catalog books without adding them to a library.");
      (error as any).status = 403;
      throw error;
    }

    return {
      userBookId: null,
      bookId,
      alreadyInLibrary: false,
      globalOnly: true,
      addedToCatalogOnly: true,
    };
  }

  if (destinations.teachingBooks && !isTeacherProfile(actorProfile)) {
    const error = new Error("Only teachers can add books to My Teaching Books.");
    (error as any).status = 403;
    throw error;
  }

  if (destinations.studentLibrary) {
    const canAdd = await canAddToTargetUser({
      supabase,
      actorId: authUserId,
      targetUserId: destinations.targetUserId,
      actorProfile,
    });

    if (!canAdd) {
      const error = new Error("You do not have permission to add books to that student.");
      (error as any).status = 403;
      throw error;
    }
  }

  let teacherUserBookId: string | null = null;
  let studentUserBookId: string | null = null;
  let teacherBookId: string | null = null;
  let lessonBook: unknown = null;
  let alreadyInTeacherLibrary = false;
  let alreadyInStudentLibrary = false;
  let alreadyInTeachingBooks = false;
  let alreadyCurrentlyTeaching = false;

  if (destinations.myLibrary) {
    const teacherResult = await getOrCreateUserBook({
      supabase,
      userId: authUserId,
      bookId,
      initialPersonalTrackingStatus: "want_to_read",
      enablePersonalTracking: true,
    });
    teacherUserBookId = teacherResult.userBookId;
    alreadyInTeacherLibrary = teacherResult.alreadyInLibrary;
  }

  if (destinations.studentLibrary) {
    const studentResult = await getOrCreateUserBook({
      supabase,
      userId: destinations.targetUserId,
      bookId,
      initialPersonalTrackingStatus: "want_to_read",
      enablePersonalTracking: true,
    });
    studentUserBookId = studentResult.userBookId;
    alreadyInStudentLibrary = studentResult.alreadyInLibrary;

    if (isStudentLessonBookContext && createStudentLessonBook) {
      lessonBook = await createStudentLessonBook(studentUserBookId);
    }
  }

  if (destinations.teachingBooks) {
    if (!teacherUserBookId) {
      const teacherResult = await getOrCreateUserBook({
        supabase,
        userId: authUserId,
        bookId,
        initialPersonalTrackingStatus: "not_tracking",
        enablePersonalTracking: false,
      });
      teacherUserBookId = teacherResult.userBookId;
      alreadyInTeacherLibrary = teacherResult.alreadyInLibrary;
    }

    const teachingResult = await getOrCreateTeacherBook({
      supabase,
      teacherId: authUserId,
      bookId,
      userBookId: teacherUserBookId,
    });
    teacherBookId = teachingResult.teacherBookId;
    alreadyInTeachingBooks = teachingResult.alreadyInTeachingBooks;
    alreadyCurrentlyTeaching = teachingResult.alreadyCurrentlyTeaching;
  }

  const userBookId = studentUserBookId ?? teacherUserBookId;

  return {
    userBookId,
    teacherUserBookId,
    studentUserBookId,
    teacherBookId,
    bookId,
    alreadyInLibrary: destinations.studentLibrary
      ? alreadyInStudentLibrary
      : alreadyInTeacherLibrary,
    alreadyInTeacherLibrary,
    alreadyInStudentLibrary,
    alreadyInTeachingBooks,
    alreadyCurrentlyTeaching,
    addedToMyLibrary: destinations.myLibrary,
    addedToTeachingBooks: destinations.teachingBooks,
    addedToStudentLibrary: destinations.studentLibrary,
    addedToCatalogOnly: destinations.catalogOnly,
    lessonBook,
  };
}
