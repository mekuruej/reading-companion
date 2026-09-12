import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAllUserTeacher } from "@/lib/teacher/targetUserAccess";
import { canUseStudentsCategory, isActiveStudentRelationship, type StudentsCategory } from "@/lib/teacher/studentsIndex";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PAGE_SIZE = 24;

// Page relationship/search matches too, so Supabase's row limit cannot silently drop learners.
async function collect<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: actor, error: actorError } = await db.from("profiles").select("role, is_super_teacher").eq("id", auth.user.id).maybeSingle();
    if (actorError) throw actorError;
    const params = new URL(request.url).searchParams;
    const category = (params.get("category") ?? "current") as StudentsCategory;
    if (!["trial", "current", "all", "past"].includes(category)) {
      return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    }
    if (!canUseStudentsCategory(actor, category)) {
      return NextResponse.json({ error: "Teacher or super-teacher access is required." }, { status: 403 });
    }
    const elevated = isAllUserTeacher(actor);
    const page = Math.max(0, Math.floor(Number(params.get("page")) || 0));
    const q = (params.get("q") ?? "").trim().slice(0, 120);
    const links = await collect<{ teacher_id: string; student_id: string; archived_at: string | null }>((from, to) => {
      let query = db.from("teacher_students").select("teacher_id, student_id, archived_at")
        .order("teacher_id").order("student_id").range(from, to);
      if (!elevated) query = query.eq("teacher_id", auth.user!.id);
      return query;
    });
    const activeIds = new Set(links.filter(isActiveStudentRelationship).map(link => link.student_id));
    const pastIds = new Set(links.filter(link => !isActiveStudentRelationship(link) && !activeIds.has(link.student_id)).map(link => link.student_id));
    const scopedIds = category === "current" ? [...activeIds] : category === "past" ? [...pastIds] : null;
    if (scopedIds?.length === 0) return NextResponse.json({ users: [], total: 0, elevated, pageSize: PAGE_SIZE });

    let query = db.from("profiles").select("id, display_name, username, level, role, is_super_teacher, lesson_day, app_access_type, app_access_expires_at", { count: "exact" })
      .neq("id", auth.user.id);
    if (scopedIds) query = query.in("id", scopedIds);
    if (category === "trial") {
      // getAppAccessStatus: active trial entitlement with a future expiry; staff access takes precedence.
      query = query.ilike("app_access_type", "trial").gte("app_access_expires_at", new Date().toISOString())
        .or("role.is.null,role.not.in.(teacher,super_teacher,admin)")
        .or("is_super_teacher.is.null,is_super_teacher.eq.false");
    }
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      const quotedPattern = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      // Preserve book-title searching without loading every user's library into the index.
      const bookMatches = category === "past" && !elevated ? [] : await collect<{ user_id: string }>((from, to) => {
        let books = db.from("user_books").select("user_id, books!inner(title)")
          .ilike("books.title", pattern).order("id").range(from, to);
        if (scopedIds) books = books.in("user_id", scopedIds);
        return books;
      });
      const bookUserIds = [...new Set(bookMatches.map(row => row.user_id))];
      const filters = ["display_name", "username", "level", "lesson_day"].map(field => `${field}.ilike.${quotedPattern}`);
      if (bookUserIds.length) filters.push(`id.in.(${bookUserIds.join(",")})`);
      query = query.or(filters.join(","));
    }
    const { data: profiles, error, count } = await query.order("display_name", { nullsFirst: false }).order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const users = await Promise.all((profiles ?? []).map(async profile => {
      // One latest session per person avoids a busy reader exhausting a shared row limit.
      const { data: activity, error: activityError } = category === "past" && !elevated
        ? { data: null, error: null }
        : await db.from("user_book_reading_sessions").select("read_on, user_books!inner(user_id)")
          .eq("user_books.user_id", profile.id).not("read_on", "is", null)
          .order("read_on", { ascending: false }).limit(1).maybeSingle();
      if (activityError) throw activityError;
      return { ...profile, isCurrentStudent: activeIds.has(profile.id),
        lastEngagedAt: activity?.read_on ?? null,
        archivedTeacherId: links.find(link => link.student_id === profile.id && link.archived_at)?.teacher_id ?? null };
    }));
    return NextResponse.json({ users, total: count ?? 0, elevated, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error("Students index failed:", error);
    return NextResponse.json({ error: "Could not load students." }, { status: 500 });
  }
}
