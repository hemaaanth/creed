import { NextResponse } from "next/server";
import { entitlementGrantsAccess } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Billing status for the current user.
//
// Reads via the user's session client + the "Read own entitlement" RLS
// policy, so this stays cheap (no admin client, no token decrypts) and
// safe (a user can only see their own row). Unauthed callers get a
// no-access payload without a 401 - the marketing chrome polls this on
// every signed-in render and we don't want a wall of red 401s when
// someone signs out.
//
// `paid` is kept as the legacy "has app access" boolean (lifetime owned OR
// active subscription) that the marketing header + onboarding gate read.
// The richer fields drive the billing dialog and the pricing-card CTAs.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `Cache-Control: private, no-store` because the payload differs per user
// and a stale value (an unpaid user seeing a previous paid user's `true`)
// would unlock the app for someone who hasn't bought it.
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

type StatusPayload = {
  paid: boolean;
  plan: string | null;
  billingMode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const NO_ACCESS: StatusPayload = {
  paid: false,
  plan: null,
  billingMode: null,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(NO_ACCESS, { headers: NO_STORE_HEADERS });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(NO_ACCESS, { headers: NO_STORE_HEADERS });
  }

  const { data, error } = await supabase
    .from("creed_entitlements")
    .select("plan, billing_mode, status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    // Don't leak the DB error; treat as no access so the UI doesn't
    // accidentally show "Owned" on a transient failure.
    return NextResponse.json(NO_ACCESS, { headers: NO_STORE_HEADERS });
  }

  const row = data as {
    plan?: string;
    billing_mode?: string;
    status?: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  };

  const payload: StatusPayload = {
    paid: entitlementGrantsAccess(row),
    plan: row.plan ?? null,
    billingMode: row.billing_mode ?? null,
    status: row.status ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };

  return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
}
