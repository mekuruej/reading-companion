import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canUseStudentsIndex } from "@/lib/teacher/studentsIndex";
import { loadTeacherAttention } from "@/lib/teacher/attention";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: auth, error } = await db.auth.getUser(token);
    if (error || !auth.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { data: actor, error: profileError } = await db.from("profiles").select("role, is_super_teacher").eq("id", auth.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!canUseStudentsIndex(actor)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    return NextResponse.json(await loadTeacherAttention(db, auth.user.id, actor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Teacher attention failed:", error);
    return NextResponse.json({ error: "Could not load teacher attention." }, { status: 500 });
  }
}
