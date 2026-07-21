import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function canGrantTrial(profile: ProfileRow | null) {
  return (
    profile?.role === "teacher" ||
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
    .select("id, role, is_super_teacher, app_access_type, app_access_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

function isActiveNonTrialFullAccess(profile: ProfileRow) {
  const accessType = profile.app_access_type ?? "";
  const isTrialCompatibleType =
    !accessType ||
    accessType === "trial" ||
    accessType === "free" ||
    accessType === "expired" ||
    accessType === "none" ||
    accessType === "inactive";

  if (isTrialCompatibleType) return false;
  if (!profile.app_access_expires_at) return true;

  const expiry = new Date(profile.app_access_expires_at).getTime();
  return !Number.isNaN(expiry) && expiry >= Date.now();
}

async function findUserIdByEmail(email: string) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const users = (data.users ?? []) as Array<{ id?: string; email?: string | null }>;
    const user = users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
    );

    if (user?.id) return user.id;
    if (users.length < 1000) return null;

    page += 1;
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const actorProfile = await getProfile(auth.user.id);

  if (!canGrantTrial(actorProfile)) {
    return NextResponse.json(
      { error: "Teacher access is required to grant a trial." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Please enter a valid user email." },
      { status: 400 }
    );
  }

  const targetUserId = await findUserIdByEmail(email);

  if (!targetUserId) {
    return NextResponse.json(
      { error: "No signed-up MEKURU user was found for that email." },
      { status: 404 }
    );
  }

  const targetProfile = await getProfile(targetUserId);

  if (!targetProfile) {
    return NextResponse.json(
      { error: "That user has signed up, but has not created a MEKURU profile yet." },
      { status: 404 }
    );
  }

  if (canGrantTrial(targetProfile) || isActiveNonTrialFullAccess(targetProfile)) {
    return NextResponse.json(
      { error: "That user already has an active full-access grant." },
      { status: 409 }
    );
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      app_access_type: "trial",
      app_access_expires_at: trialEndsAt.toISOString(),
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq("id", targetUserId)
    .select(
      "id, display_name, username, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at"
    )
    .maybeSingle();

  if (error) {
    console.error("Error granting trial access:", error);
    return NextResponse.json(
      { error: "Could not grant the trial right now." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    profile: data,
    email,
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
  });
}
