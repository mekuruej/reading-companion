import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { discoverTeachingSources } from "@/lib/teacher/teachingSource";
import { StudentContextError } from "@/lib/teacher/studentToolContext";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const auth = await db.auth.getUser(token);
    if (!token || auth.error || !auth.data.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const q = new URL(request.url).searchParams;
    return NextResponse.json(await discoverTeachingSources(db, auth.data.user.id, q.get("studentId") ?? "", q.get("targetUserBookId") ?? ""), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not find teaching sources." }, { status: error instanceof StudentContextError ? error.status : 500 });
  }
}
