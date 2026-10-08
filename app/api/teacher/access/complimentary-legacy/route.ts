import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canGrantComplimentaryLegacyAccess,
  isSuperTeacherAccount,
} from "@/lib/access/complimentaryLegacyAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticate(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Missing session.", status: 401 as const };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: "Invalid session.", status: 401 as const };
  return { user: data.user };
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { data: actor, error: actorError } = await supabaseAdmin.from("profiles")
      .select("role, is_super_teacher").eq("id", auth.user.id).maybeSingle();
    if (actorError) throw actorError;
    if (!isSuperTeacherAccount(actor)) {
      return NextResponse.json({ error: "Super teacher access is required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    if (!userId || !["grant", "revoke"].includes(action)) {
      return NextResponse.json({ error: "userId and a valid action are required." }, { status: 400 });
    }
    if (userId === auth.user.id) {
      return NextResponse.json({ error: "You cannot grant this access to yourself." }, { status: 400 });
    }

    if (action === "revoke") {
      const { error } = await supabaseAdmin.rpc("revoke_complimentary_legacy_access", {
        p_user_id: userId,
        p_revoked_by: auth.user.id,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, action: "revoked" });
    }

    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      return NextResponse.json({ error: "Enter a reason of 1 to 500 characters." }, { status: 400 });
    }
    const { data: target, error: targetError } = await supabaseAdmin.from("profiles")
      .select("role, is_super_teacher, app_access_type, app_access_subscription_id")
      .eq("id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: "User profile not found." }, { status: 404 });

    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin.from("stripe_subscriptions")
      .select("status, paid_through").eq("user_id", userId);
    if (subscriptionsError) throw subscriptionsError;
    const hasActiveSubscription = (subscriptions ?? []).some(subscription =>
      !["canceled", "incomplete_expired"].includes(subscription.status) ||
      (subscription.paid_through != null && Date.parse(subscription.paid_through) > Date.now())
    );
    if (!canGrantComplimentaryLegacyAccess(target, hasActiveSubscription)) {
      return NextResponse.json({
        error: "This account has staff, lesson, inactive, or Stripe-managed access that must be preserved.",
      }, { status: 409 });
    }

    const { error } = await supabaseAdmin.rpc("grant_complimentary_legacy_access", {
      p_user_id: userId,
      p_reason: reason,
      p_granted_by: auth.user.id,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, action: "granted" });
  } catch (error) {
    console.error("Complimentary legacy access update failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update complimentary access." }, { status: 500 });
  }
}
