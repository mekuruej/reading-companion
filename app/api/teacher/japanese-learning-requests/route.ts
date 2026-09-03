import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppAccessStatus } from "@/lib/access/appAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  role?: string | null;
  is_super_teacher?: boolean | string | null;
  app_access_type?: string | null;
  app_access_expires_at?: string | null;
};

const GUIDED_TRIAL_DAYS = 28;

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function canReviewRequests(profile: ProfileRow | null) {
  return Boolean(
    profile?.role === "super_teacher" ||
      profile?.role === "admin" ||
      isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function isTeacherOrElevatedProfile(profile: ProfileRow | null) {
  return Boolean(
    profile?.role === "teacher" ||
      profile?.role === "super_teacher" ||
      profile?.role === "admin" ||
      isSuperTeacherFlag(profile?.is_super_teacher)
  );
}

function isActiveNonTrialFullAccess(profile: ProfileRow | null) {
  if (!profile) return false;
  const access = getAppAccessStatus(profile);
  return access.hasFullAccess && access.reason !== "trial" && access.reason !== "staff";
}

function hasExistingTrial(profile: ProfileRow | null) {
  return (profile?.app_access_type ?? "").trim().toLowerCase() === "trial";
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, username, role, is_super_teacher, app_access_type, app_access_expires_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data;
}

async function requireReviewer(req: Request) {
  const auth = await getAuthenticatedUser(req);
  if ("error" in auth) return auth;

  const profile = await getProfile(auth.user.id);
  if (!canReviewRequests(profile)) {
    return { error: "Super teacher access is required.", status: 403 as const };
  }

  return { user: auth.user, profile };
}

async function emailForUser(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

async function createTrialStartedAlert({
  userId,
  trialStartedAt,
  trialEndsAt,
}: {
  userId: string;
  trialStartedAt: string;
  trialEndsAt: string;
}) {
  const { error } = await supabaseAdmin.from("user_alerts").insert({
    user_id: userId,
    type: "japanese_learning_trial_started",
    message: `Your Japanese Learning trial has started.\n\nStarted: ${trialStartedAt}\nEnds: ${trialEndsAt}`,
  });

  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const auth = await requireReviewer(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const status = cleanText(url.searchParams.get("status")) || "pending";
    const query = supabaseAdmin
      .from("japanese_learning_access_requests")
      .select(
        `
          id,
          user_id,
          status,
          note,
          reading_experience,
          jlpt_level,
          request_source,
          requested_at,
          reviewed_at,
          reviewed_by,
          review_note,
          profiles:user_id (
            display_name,
            username,
            app_access_type,
            app_access_expires_at
          )
        `
      )
      .order("requested_at", { ascending: false });

    if (status !== "all") {
      query.eq("status", status);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    const requests = await Promise.all(
      ((data ?? []) as any[]).map(async (row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          userId: row.user_id,
          status: row.status,
          note: row.note,
          readingExperience: row.reading_experience,
          jlptLevel: row.jlpt_level,
          source: row.request_source,
          requestedAt: row.requested_at,
          reviewedAt: row.reviewed_at,
          reviewedBy: row.reviewed_by,
          reviewNote: row.review_note,
          displayName: profile?.display_name ?? null,
          username: profile?.username ?? null,
          email: await emailForUser(row.user_id),
          appAccessType: profile?.app_access_type ?? null,
          appAccessExpiresAt: profile?.app_access_expires_at ?? null,
        };
      })
    );

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error loading Japanese Learning requests:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not load Japanese Learning requests." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireReviewer(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const requestId = cleanText(body?.requestId);
    const action = cleanText(body?.action);
    const reviewNote = cleanText(body?.reviewNote).slice(0, 600) || null;

    if (
      !requestId ||
      (action !== "approve" && action !== "decline" && action !== "start_trial")
    ) {
      return NextResponse.json(
        { error: "requestId and action=approve|decline|start_trial are required." },
        { status: 400 }
      );
    }

    const { data: existingRequest, error: existingError } = await supabaseAdmin
      .from("japanese_learning_access_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (action === "start_trial") {
      if (existingRequest.status !== "approved") {
        return NextResponse.json(
          { error: "Only approved Guided Trial requests can be activated." },
          { status: 409 }
        );
      }

      const targetProfile = await getProfile(existingRequest.user_id);

      if (!targetProfile) {
        return NextResponse.json(
          { error: "The requesting user does not have a profile." },
          { status: 404 }
        );
      }

      if (isTeacherOrElevatedProfile(targetProfile) || isActiveNonTrialFullAccess(targetProfile)) {
        return NextResponse.json(
          { error: "That user already has full access." },
          { status: 409 }
        );
      }

      if (hasExistingTrial(targetProfile)) {
        return NextResponse.json(
          { error: "That user already has or had trial access." },
          { status: 409 }
        );
      }

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + GUIDED_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const trialStartedAt = now.toISOString();

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          app_access_type: "trial",
          trial_started_at: trialStartedAt,
          app_access_expires_at: trialEndsAt.toISOString(),
        })
        .eq("id", existingRequest.user_id);

      if (profileUpdateError) throw profileUpdateError;

      let notificationError: string | null = null;
      try {
        await createTrialStartedAlert({
          userId: existingRequest.user_id,
          trialStartedAt,
          trialEndsAt: trialEndsAt.toISOString(),
        });
      } catch (error: any) {
        notificationError =
          error?.message ?? "Could not create Japanese Learning trial notification.";
        console.error("Error creating Japanese Learning trial notification:", error);
      }

      return NextResponse.json({
        ok: true,
        requestId,
        trialStartedAt,
        trialEndsAt: trialEndsAt.toISOString(),
        notificationError,
      });
    }

    if (existingRequest.status !== "pending") {
      return NextResponse.json({
        ok: true,
        requestId,
        status: existingRequest.status,
        unchanged: true,
      });
    }

    const now = new Date();

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from("japanese_learning_access_requests")
      .update({
        status: action === "approve" ? "approved" : "declined",
        reviewed_at: now.toISOString(),
        reviewed_by: auth.user.id,
        review_note: reviewNote,
      })
      .eq("id", requestId)
      .select("id, status, reviewed_at")
      .maybeSingle();

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error("Error reviewing Japanese Learning request:", error);
    return NextResponse.json(
      { error: error?.message ?? "Could not review this Japanese Learning request." },
      { status: 500 }
    );
  }
}
