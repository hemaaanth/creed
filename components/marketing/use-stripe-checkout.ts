"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type CheckoutPlan = "personal" | "company";
export type CheckoutMode = "subscription" | "lifetime";

// Starts a Stripe Checkout for a plan + billing mode and redirects to it.
// Shared by the pricing toggle CTAs and the onboarding "Get Creed" button so
// the already-owned / already-subscribed (409) handling and error copy live in
// one place. On success the browser navigates to Stripe, so `submitting` is
// intentionally left true (the page is leaving); it's only reset on error.
//
// Defaults to personal + subscription (the onboarding "try it" path).
export function useStripeCheckout() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = useCallback(
    async (opts?: { plan?: CheckoutPlan; mode?: CheckoutMode }) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: opts?.plan ?? "personal",
            mode: opts?.mode ?? "subscription",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
          alreadyOwned?: boolean;
          alreadySubscribed?: boolean;
        };
        if (data.alreadyOwned) {
          toast.success("You already own Creed");
          router.push("/file");
          return;
        }
        if (data.alreadySubscribed) {
          toast.success("You're already subscribed");
          router.push("/file");
          return;
        }
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Couldn't start checkout");
        }
        window.location.href = data.url;
      } catch (error) {
        setSubmitting(false);
        toast.error(error instanceof Error ? error.message : "Couldn't start checkout");
      }
    },
    [router, submitting]
  );

  return { startCheckout, submitting };
}
