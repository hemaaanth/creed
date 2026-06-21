import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireApiAuth } from "@/lib/api-auth";
import {
  type BillingMode,
  type CreedPlan,
  getEntitlement,
  getStripeClient,
  isPlanPurchasable,
  resolvePriceId,
} from "@/lib/stripe";
import { getSiteUrl } from "@/lib/supabase/env";
import { log } from "@/lib/observability";

// Auth-required. Creates a Checkout Session for the selected plan + billing
// mode, keyed to the current Supabase user. The user id rides in both
// `client_reference_id` and `metadata.supabaseUserId` (read by the webhook +
// success-page upsert); for subscriptions it's also stamped on
// `subscription_data.metadata` so later subscription lifecycle events can be
// attributed without a session.
//
// Guards:
//   - lifetime owner          → 409 alreadyOwned (ownership is terminal).
//   - active sub + subscribe  → 409 alreadySubscribed (manage instead).
//   - active sub + lifetime   → allowed: this is the upgrade-to-own path.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePlan(value: unknown): CreedPlan {
  return value === "company" ? "company" : "personal";
}

function parseMode(value: unknown): BillingMode {
  return value === "lifetime" ? "lifetime" : "subscription";
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user.email) {
    return NextResponse.json(
      { error: "Account is missing an email. Sign in again with Google." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: unknown; mode?: unknown };
  const plan = parsePlan(body.plan);
  const mode = parseMode(body.mode);

  // Company stays "Coming Soon" until its price ids are configured. Refuse the
  // session rather than charging the wrong price.
  if (plan !== "personal" && !isPlanPurchasable(plan)) {
    return NextResponse.json(
      { error: "That plan isn't available yet." },
      { status: 400 }
    );
  }

  try {
    const existing = await getEntitlement(user.id);
    if (existing && existing.billingMode === "lifetime" && existing.status === "paid") {
      return NextResponse.json(
        { error: "You already own Creed.", alreadyOwned: true },
        { status: 409 }
      );
    }
    if (
      mode === "subscription" &&
      existing &&
      existing.billingMode === "subscription" &&
      ["active", "trialing", "past_due"].includes(existing.status)
    ) {
      return NextResponse.json(
        { error: "You already have an active subscription.", alreadySubscribed: true },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const priceId = await resolvePriceId(plan, mode);
    const baseUrl = getSiteUrl();
    const email = user.email.trim().toLowerCase();
    const reuseCustomerId = existing?.stripeCustomerId ?? null;

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: mode === "subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        supabaseUserId: user.id,
        email,
        product: "creed_hosted",
        plan,
        billingMode: mode,
      },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      // Cancelling returns to onboarding, which resumes a composed-but-unpaid
      // user straight on their Creed preview rather than a cold pricing page.
      cancel_url: `${baseUrl}/onboarding`,
      allow_promotion_codes: true,
    };

    // Reuse the existing Stripe customer when we have one (so a subscriber's
    // upgrade and the billing portal see a single customer). Otherwise hand
    // Stripe the email; for one-time payments force customer creation so the
    // portal + a future upgrade have a customer to attach to.
    if (reuseCustomerId) {
      params.customer = reuseCustomerId;
    } else {
      params.customer_email = email;
      if (mode === "lifetime") {
        params.customer_creation = "always";
      }
    }

    if (mode === "subscription") {
      params.subscription_data = {
        metadata: { supabaseUserId: user.id, plan },
      };
    }

    // No idempotency key: a Checkout Session is just a hosted payment page,
    // not a charge, so creating an extra one is harmless - only the session
    // the user actually completes matters. A static key would be worse here:
    // Stripe caches it for 24h, so a subscriber who cancels and re-subscribes
    // the same day would be handed their old, already-completed session URL.
    // Rapid double-clicks are already guarded client-side (the `submitting`
    // flag in useStripeCheckout) and server-side (the owns / active-sub checks
    // above).
    const session = await stripe.checkout.sessions.create(params);

    if (!session.url) {
      throw new Error("Stripe returned a session without a URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    log.error(
      "stripe_checkout_failed",
      { userId: user.id, plan, mode },
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again." },
      { status: 502 }
    );
  }
}
