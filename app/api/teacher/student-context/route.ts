import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StudentContextError, validateStudentToolContext } from "@/lib/teacher/studentToolContext";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function GET(req: Request) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const q = new URL(req.url).searchParams;
    return NextResponse.json(await validateStudentToolContext(db, data.user.id, {
      studentId: q.get("studentId") ?? "", userBookId: q.get("userBookId") ?? "", sourceUserBookId: q.get("sourceUserBookId") || undefined,
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not validate student context." },
      { status: error instanceof StudentContextError ? error.status : 500 });
  }
}
