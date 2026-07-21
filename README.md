<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/assets/brand/brandmark-email-dark.png">
    <img alt="Creed" src="public/assets/brand/brandmark-email.png" width="208">
  </picture>
</h1>

**One file across every agent.**

Write yourself down once. Every AI you use reads it before answering,
and proposes updates as it learns you. You approve the good ones.

[Home](https://creed.md) · [Docs](https://creed.md/docs) · [Pricing](https://creed.md/pricing) · [Stack](https://creed.md/stack) · [Privacy](https://creed.md/privacy)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![MCP](https://img.shields.io/badge/protocol-MCP%20%2B%20OAuth%202.1-8A2BE2)](https://creed.md/docs)

</div>

## What is Creed?

Anyone using AI seriously pays the same tax: re-explaining themselves every chat, every tool, every session. Creed (creed.md) kills that tax with one file.

Your Creed is a curated personal context profile in plain Markdown, sized to read in under a minute. Connected agents (Claude, ChatGPT, Codex, Cursor, Devin, and any MCP client) read it before they answer you, and propose edits as they learn new things. The file sharpens over time instead of rotting in your notes.

It is not a notes app, a journal, or a memory dump. If you already maintain a hand-rolled `CLAUDE.md` or a "things ChatGPT gets wrong about me" list, Creed is that file as a real product: first draft written for you, quality scored, one canonical version everywhere, agent edits gated behind your approval.

```
┌──────────────────────┐         ┌────────────────────┐
│  You (onboarding)    │ ──────► │  Your Creed file   │
│  (one short pass)    │         │  10 sections, MD   │
└──────────────────────┘         └─────────┬──────────┘
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                  ┌─────────────────────┐    ┌──────────────────────┐
                  │  Agent reads it     │    │  Agent proposes an   │
                  │  before answering   │    │  update; you approve │
                  └─────────────────────┘    └──────────────────────┘
```

Ten sections, five always-on (Identity, Goals, Work, Preferences, Routines) and five optional (Beliefs, Constraints, People, Health, Context). Every section is agent-writable, per-section permissions decide whether edits apply directly or wait for review.

**Personal** is the core one-user product. **Company** extends the same file model into a shared workspace: roles, per-section permissions, attribution, invites, pooled AI credits, seat billing.

## Quickstart

Prerequisites: **Node 20+** and a free **Supabase** project. (OpenRouter key only for AI features, Stripe only for paid-plan flows.)

```bash
git clone https://github.com/connorhpbrn/creed.git
cd creed && npm install
cp .env.example .env.local   # fill in the five required vars below
supabase link --project-ref <your-project-ref> && supabase db push
npm run dev                  # → http://localhost:3000
```

Minimum `.env.local` to boot:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<service-role-key>
CREED_ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

Every other variable (OpenRouter, Stripe, GitHub sync, branding, feedback) is documented inline in [`.env.example`](./.env.example). `supabase db push` creates the full schema: sections, proposals, activity, tokens, MCP, GitHub, AI usage, audit log, rate limits, entitlements, all behind row-level security.

<details>
<summary><b>Wire up Stripe for the paid flows (optional)</b></summary>

The hosted app gates `/file` behind a paid entitlement. Locally you can skip Stripe entirely (unentitled users land on `/pricing`), or run the full flow: set the four `STRIPE_*` vars from `.env.example` with sandbox keys, then

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

and copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. Test payments then auto-grant entitlements.

</details>

<details>
<summary><b>Deploy your own hosted instance</b></summary>

- Set `NEXT_PUBLIC_SITE_URL` to your deployed origin so OAuth and Stripe redirects resolve.
- For a free self-hosted instance, set `CREED_SELF_HOSTED=1`. This removes the
  hosted Stripe entitlement gate while retaining Supabase authentication, RLS,
  and MCP token verification.
- Set `CREED_CSP_ENFORCE=1` after watching one deploy cycle in Report-Only mode.
- Create a live Stripe webhook endpoint at `https://<your-domain>/api/stripe/webhook` and use its signing secret.
- Example agent prompts referencing `https://creed.md` are illustrative; real URLs derive from your `NEXT_PUBLIC_SITE_URL`.

### Dokploy

This repository includes a production `Dockerfile`. Create a Dokploy
Application from your fork, use that Dockerfile, expose port `3000`, and add
your custom domain. Pass all `NEXT_PUBLIC_*` variables as build arguments, then
set the same values again as runtime environment variables. Next.js embeds
public variables into browser code while building; Creed also needs the site
origin at runtime for OAuth and MCP URLs.

For `https://creed.hem.so`, configure:

```text
# Build arguments and runtime variables
NEXT_PUBLIC_SITE_URL=https://creed.hem.so
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

# Runtime variables
CREED_SELF_HOSTED=1
SUPABASE_SECRET_KEY=<service-role-key>
CREED_ENCRYPTION_SECRET=<32-byte-base64-secret>
```

Apply the migrations through the Supabase dashboard, CI, or a disposable
container before the first deployment; no host Supabase CLI installation is
required. Add `https://creed.hem.so/auth/callback` to Supabase Auth redirect URLs. Add
the GitHub callback (`/auth/github/callback`) only when you enable the optional
GitHub sync integration. Stripe, OpenRouter, Resend, and feedback variables
remain optional for a basic personal deployment.

### Podman-only local verification

Do not run `npm install`, `npm ci`, or Next.js directly on the host. Build the
Dockerfile with rootless Podman when a local verification is needed; the
lockfile is installed only in the isolated image build:

```bash
podman build --target verify \
  --build-arg NEXT_PUBLIC_SITE_URL=https://creed.hem.so \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key> \
  -t creed:verify .
```

Run the resulting image with only non-secret test configuration, or inject a
scoped 1Password Environment into the Podman command for integration testing.

</details>

## Connect an agent

Open `/connections` and add the Creed MCP URL to your agent as a custom connector. The client opens a browser, you click **Allow**, done. No tokens to copy.

Creed is its own OAuth 2.1 authorization server (`/authorize`, `/token`, `/register`, `/.well-known/*`), so any spec-compliant MCP client connects from the server URL alone. First-class connect flows exist for Claude Code (one-line `claude mcp add`), Codex, Cursor (one-click), ChatGPT, Devin, OpenClaw, Hermes, OpenCode, Factory, Manus, and custom agents. Clients that do not speak MCP can use the documented `/api/creed` HTTP API.

Creed also ships a first-party terminal client. It uses the same OAuth screen
and discovers every tool, resource, and prompt from the live MCP server, so a
new MCP tool appears in the CLI without a second implementation or release.

```bash
npx creed-cli
```

Agents get three verbs: read the file, propose an update, or direct-edit where you have granted it. The MCP health dashboard tracks per-agent reads, edits, proposals, and outcomes while keeping CLI activity separate.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Tiptap editor, Framer Motion |
| Backend | Supabase (auth, Postgres, RLS, realtime), pg_cron retention jobs |
| AI | OpenRouter (managed credits or BYOK), per-feature model routing |
| Billing | Stripe (Personal and Company plans, seats, webhooks) |
| Sync | GitHub push/pull of `creed.md`, lossless Markdown round-trip |

Full tour at [creed.md/stack](https://creed.md/stack).

## Repository map

```
app/
├── (creed-app)/        signed-in product (/file, /connections, /settings)
├── api/                session-authed + token-authed APIs (incl. /api/creed, MCP, OAuth)
├── home/, onboarding/  public landing and first-run flow
components/
├── creed/              product UI        marketing/   public site
├── auth/               sign-in           ui/          shadcn primitives
lib/
├── creed-data.ts       types, sections, agent contract
├── creed-backend.ts    Supabase reads/writes
├── creed-markdown.ts   push/pull Markdown parser (lossless round-trip)
├── ai/                 OpenRouter client, model catalog, quality scoring
├── company-*.ts        Company roles, seats, billing, invites
supabase/migrations/    canonical schema (RLS everywhere)
tests/                  node:test suites
```

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm test             # test suite (node:test)
npx tsc --noEmit     # typecheck
npm run lint         # ESLint
npm run build        # production build
```

## Contributing

PRs welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first; it is short and saves us both time. **AI agents**: read [`AGENTS.md`](./AGENTS.md) instead, it is the same information written for you.

Found a vulnerability? Do not open a public issue; see [`SECURITY.md`](./SECURITY.md).

## License

[MIT](./LICENSE)
