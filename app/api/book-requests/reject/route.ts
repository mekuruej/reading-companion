import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireSuperTeacher(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: "Missing session.", status: 401 as const };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { error: "Invalid session.", status: 401 as const };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_super_teacher")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, status: 500 as const };
  }

  if (profile?.role !== "super_teacher" && !profile?.is_super_teacher) {
    return { error: "Super teacher access required.", status: 403 as const };
  }

  return { user };
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperTeacher(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const requestId = cleanText(body?.requestId);

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }

    const { data: existingRequest, error: existingError } = await supabaseAdmin
      .from("book_requests")
      .select("id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existingRequest) {
      return NextResponse.json({ error: "Book request not found." }, { status: 404 });
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json({
        ok: true,
        requestId,
        status: existingRequest.status,
      });
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("book_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select("id, status")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updatedRequest || updatedRequest.status !== "rejected") {
      return NextResponse.json(
        { error: "Book request could not be rejected." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      requestId,
      status: updatedRequest.status,
    });
  } catch (err: any) {
    console.error("Error rejecting book request:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not reject book request." },
      { status: 500 }
    );
  }
}
