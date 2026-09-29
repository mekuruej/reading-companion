import { requiresTeachingRetention } from "@/lib/teacher/teachingRetention";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthenticatedUser(req: Request) {
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

  return { user };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userBookId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userBookId } = await context.params;

  if (!userBookId) {
    return NextResponse.json(
      { error: "Missing user book id." },
      { status: 400 }
    );
  }

  const { data: userBook, error: userBookError } = await supabaseAdmin
    .from("user_books")
    .select("id, user_id, book_id")
    .eq("id", userBookId)
    .maybeSingle();

  if (userBookError) {
    console.error("Error checking user book ownership:", userBookError);
    return NextResponse.json(
      { error: "Could not check this book yet." },
      { status: 500 }
    );
  }

  if (!userBook) {
    return NextResponse.json(
      { error: "This book is not in your library." },
      { status: 404 }
    );
  }

  if (userBook.user_id !== auth.user.id) {
    return NextResponse.json(
      { error: "You can only remove books from your own library." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const choice = body?.teachingChoice;
  if (choice != null && choice !== "keep" && choice !== "remove") {
    return NextResponse.json({ error: "Choose whether to keep this teaching book." }, { status: 400 });
  }

  let removalStep = "check teaching dependencies";
  try {
    const hasTeachingData = await requiresTeachingRetention(supabaseAdmin, auth.user.id, userBook.book_id, userBookId);
    if (hasTeachingData && !choice) {
      return NextResponse.json({
        error: "This book has teaching connections. Choose whether to keep it in My Teaching Books.",
        requiresTeachingChoice: true,
      }, { status: 409 });
    }

    if (choice === "keep") {
      // Retention requires an explicit choice; never silently create a teaching book.
      if (!hasTeachingData) {
        return NextResponse.json({ error: "This book no longer has a teaching connection. Please reload." }, { status: 409 });
      }
      removalStep = "retain teaching copy";
      const { data: retained, error } = await supabaseAdmin.from("user_books")
        .update({ personal_tracking_status: "not_tracking" })
        .eq("id", userBookId).eq("user_id", auth.user.id).eq("book_id", userBook.book_id)
        .select("id").single();
      if (error || !retained) throw error ?? new Error("Workspace no longer exists.");
      return NextResponse.json({ success: true, outcome: "retained_as_teaching_only" });
    }

    // One database transaction prevents partial deletion if any dependency fails.
    removalStep = "remove copy transaction";
    const { error } = await supabaseAdmin.rpc("remove_owned_library_book", {
      p_actor_id: auth.user.id,
      p_user_book_id: userBookId,
      p_remove_teaching: choice === "remove",
    });
    if (error) throw error;
    return NextResponse.json({ success: true, outcome: "removed" });
  } catch (error) {
    // Error properties are often non-enumerable and otherwise log as {}.
    const failure = error as { code?: string; message?: string; details?: string; hint?: string } | null;
    const diagnostic = {
      step: removalStep,
      code: failure?.code ?? null,
      message: failure?.message ?? String(error),
      details: failure?.details ?? null,
      hint: failure?.hint ?? null,
    };
    console.error("Could not safely remove library book:", diagnostic);
    const message = "Could not safely remove this book. Nothing was removed. Please reload and try again.";
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? `${message} Diagnostic: ${diagnostic.step}: ${diagnostic.code ?? "error"}: ${diagnostic.message}`
        : message,
    }, { status: 500 });
  }
}
