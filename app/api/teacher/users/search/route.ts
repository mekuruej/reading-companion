import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function canSearchAllUsers(profile: ProfileRow | null) {
  return (
    profile?.role === "admin" ||
    profile?.role === "super_teacher" ||
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
    .select("id, display_name, username, role, is_super_teacher")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

function profileMatchesQuery(profile: ProfileRow, normalizedQuery: string) {
  const displayName = profile.display_name?.toLowerCase() ?? "";
  const username = profile.username?.toLowerCase() ?? "";
  return displayName.includes(normalizedQuery) || username.includes(normalizedQuery);
}

async function listMatchingAuthEmails(normalizedQuery: string, limit: number) {
  const emailById = new Map<string, string | null>();
  let page = 1;

  while (emailById.size < limit && page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const authUsers = data.users ?? [];
    for (const user of authUsers) {
      if (emailById.size >= limit) break;
      if (user.email?.toLowerCase().includes(normalizedQuery)) {
        emailById.set(user.id, user.email ?? null);
      }
    }

    if (authUsers.length < 1000) break;
    page += 1;
  }

  return emailById;
}

async function loadAuthEmailsForIds(userIds: string[]) {
  const missingIds = new Set(userIds);
  const emailById = new Map<string, string | null>();
  let page = 1;

  while (missingIds.size > 0 && page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const authUsers = data.users ?? [];
    for (const user of authUsers) {
      if (!missingIds.has(user.id)) continue;
      emailById.set(user.id, user.email ?? null);
      missingIds.delete(user.id);
    }

    if (authUsers.length < 1000) break;
    page += 1;
  }

  return emailById;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const actorProfile = await getProfile(auth.user.id);
    if (!canSearchAllUsers(actorProfile)) {
      return NextResponse.json(
        { error: "Super teacher access is required to search all users." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12), 1), 20);
    const byId = new Map<string, ProfileRow & { email?: string | null }>();
    const emailMatchIds = new Set<string>();

    const [displayNameMatches, usernameMatches] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, username")
        .ilike("display_name", `%${query}%`)
        .order("display_name", { ascending: true })
        .limit(limit),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, username")
        .ilike("username", `%${query}%`)
        .order("username", { ascending: true })
        .limit(limit),
    ]);

    if (displayNameMatches.error) throw displayNameMatches.error;
    if (usernameMatches.error) throw usernameMatches.error;

    for (const profile of [
      ...((displayNameMatches.data ?? []) as ProfileRow[]),
      ...((usernameMatches.data ?? []) as ProfileRow[]),
    ]) {
      if (byId.size >= limit) break;
      byId.set(profile.id, profile);
    }

    if (normalizedQuery.includes("@") || normalizedQuery.length >= 3) {
      const matchingEmails = await listMatchingAuthEmails(normalizedQuery, limit);
      for (const userId of matchingEmails.keys()) {
        emailMatchIds.add(userId);
      }
      const profileIdsToLoad = Array.from(matchingEmails.keys()).filter((id) => !byId.has(id));

      if (profileIdsToLoad.length > 0) {
        const { data: emailProfiles, error: emailProfileError } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, username")
          .in("id", profileIdsToLoad);

        if (emailProfileError) throw emailProfileError;

        for (const profile of (emailProfiles ?? []) as ProfileRow[]) {
          if (byId.size >= limit) break;
          byId.set(profile.id, {
            ...profile,
            email: matchingEmails.get(profile.id) ?? null,
          });
        }
      }
    }

    const resultEmails = await loadAuthEmailsForIds(Array.from(byId.keys()));

    const users = Array.from(byId.values())
      .map((profile) => ({
        ...profile,
        email: profile.email ?? resultEmails.get(profile.id) ?? null,
      }))
      .filter((profile) => profileMatchesQuery(profile, normalizedQuery) || emailMatchIds.has(profile.id))
      .slice(0, limit)
      .map((profile) => ({
        id: profile.id,
        displayName: profile.display_name ?? null,
        username: profile.username ?? null,
        email: profile.email ?? null,
      }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Teacher all-user search failed:", error);
    return NextResponse.json(
      { error: "Could not search users right now." },
      { status: 500 }
    );
  }
}
