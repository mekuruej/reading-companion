import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchLibraryStudyColorInfoByWord } from "@/lib/libraryStudyColorLookup";
import { canTeacherAccessStudent } from "@/lib/teacher/studentLessonBooks";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
};

type WordForColorLookup = {
  surface?: string | null;
  reading?: string | null;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function isSuperTeacher(profile: ProfileRow | null) {
  return (
    profile?.role === "super_teacher" ||
    profile?.role === "admin" ||
    isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing session.", status: 401 as const };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { error: "Invalid session.", status: 401 as const };
  }

  return { user };
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

function cleanWords(value: unknown): WordForColorLookup[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((word) => ({
      surface: typeof word?.surface === "string" ? word.surface.trim() : "",
      reading: typeof word?.reading === "string" ? word.reading.trim() : "",
    }))
    .filter((word) => word.surface && word.reading)
    .slice(0, 500);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(req);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userBookId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const words = cleanWords(body?.words);

    if (!userBookId || words.length === 0) {
      return NextResponse.json({ colors: {} });
    }

    const [{ data: userBook, error: userBookError }, profile] =
      await Promise.all([
        supabaseAdmin
          .from("user_books")
          .select("id, user_id")
          .eq("id", userBookId)
          .maybeSingle(),
        getProfile(authResult.user.id),
      ]);

    if (userBookError) throw userBookError;

    const ownerUserId = (userBook as any)?.user_id as string | undefined;

    if (!ownerUserId) {
      return NextResponse.json(
        { error: "This book could not be found." },
        { status: 404 }
      );
    }

    const canAccess =
      ownerUserId === authResult.user.id ||
      isSuperTeacher(profile) ||
      (await canTeacherAccessStudent({
        supabase: supabaseAdmin,
        teacherId: authResult.user.id,
        studentId: ownerUserId,
        teacherProfile: profile,
      }));

    if (!canAccess) {
      return NextResponse.json(
        { error: "You do not have access to this book." },
        { status: 403 }
      );
    }

    const colors = await fetchLibraryStudyColorInfoByWord(
      supabaseAdmin,
      ownerUserId,
      words,
      { includeMissingAsFirstEncounter: true }
    );

    return NextResponse.json({ colors });
  } catch (error: any) {
    console.error("Error loading book library colors:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load library colors." },
      { status: 500 }
    );
  }
}
