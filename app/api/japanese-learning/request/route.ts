import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppAccessStatus } from "@/lib/access/appAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
  trial_started_at?: string | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanSource(value: unknown) {
  const source = cleanText(value);
  if (
    source === "study_hub" ||
    source === "book_hub" ||
    source === "japanese_learning_page"
  ) {
    return source;
  }
  return "japanese_learning_page";
}

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

async function loadProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data;
}

async function loadLatestRequest(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("japanese_learning_access_requests")
    .select("id, status, note, request_source, requested_at, reviewed_at")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const profile = await loadProfile(auth.user.id);
    const accessStatus = profile
      ? getAppAccessStatus(profile)
      : { hasFullAccess: false, reason: "missing_profile" };
    const latestRequest = await loadLatestRequest(auth.user.id);

    return NextResponse.json({
      access: {
        hasFullAccess: accessStatus.hasFullAccess,
        reason: accessStatus.reason,
        accessType: profile?.app_access_type ?? null,
        trialStartedAt: profile?.trial_started_at ?? null,
        trialEndsAt: profile?.app_access_expires_at ?? null,
        expiresAt: profile?.app_access_expires_at ?? null,
      },
      request: latestRequest ?? null,
    });
  } catch (error: any) {
    console.error("Error loading Japanese Learning request:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load Japanese Learning request." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const profile = await loadProfile(auth.user.id);
    const accessStatus = profile
      ? getAppAccessStatus(profile)
      : { hasFullAccess: false, reason: "missing_profile" };

    if (accessStatus.hasFullAccess) {
      return NextResponse.json({
        ok: true,
        access: {
          hasFullAccess: true,
          reason: accessStatus.reason,
          accessType: profile?.app_access_type ?? null,
          trialStartedAt: profile?.trial_started_at ?? null,
          trialEndsAt: profile?.app_access_expires_at ?? null,
          expiresAt: profile?.app_access_expires_at ?? null,
        },
        request: await loadLatestRequest(auth.user.id),
      });
    }

    const body = await request.json().catch(() => null);
    const note = cleanText(body?.note).slice(0, 600) || null;
    const requestSource = cleanSource(body?.source);

    const { data: pendingRequest, error: pendingError } = await supabaseAdmin
      .from("japanese_learning_access_requests")
      .select("id, status, note, request_source, requested_at, reviewed_at")
      .eq("user_id", auth.user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) throw pendingError;

    if (pendingRequest) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        request: pendingRequest,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("japanese_learning_access_requests")
      .insert({
        user_id: auth.user.id,
        status: "pending",
        note,
        request_source: requestSource,
      })
      .select("id, status, note, request_source, requested_at, reviewed_at")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      request: data,
    });
  } catch (error: any) {
    console.error("Error creating Japanese Learning request:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not request a Japanese Learning invitation." },
      { status: 500 }
    );
  }
}
