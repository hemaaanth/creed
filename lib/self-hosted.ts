import "server-only";

// Self-hosted installations own their access policy and do not use Creed's
// hosted Stripe entitlements. Keep this server-only so a deployment cannot
// accidentally expose its commercial-mode decision to the browser bundle.
export function isSelfHostedMode() {
  return process.env.CREED_SELF_HOSTED === "1";
}
