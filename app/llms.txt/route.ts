import { getSiteUrl } from "@/lib/supabase/env";

// Serves /llms.txt - the emerging convention that gives AI crawlers a clean,
// plain-text map of the site's most citable pages and a one-paragraph summary
// of what Creed is. Built from the deploy origin so links resolve correctly.
export const dynamic = "force-static";

export function GET() {
  const base = getSiteUrl().replace(/\/$/, "");

  const body = `# Creed

> Creed is one personal context file that every AI reads before it answers. Written once, kept current by your agents, and portable across every tool you use.

## About

- [What is a personal context file?](${base}/context): The category explained - what goes in the file, how agents keep it current, and how it differs from a chatbot's memory.
- [Home](${base}/home): What Creed is and how it works.
- [Pricing](${base}/pricing): Plans and access.
- [Docs](${base}/docs): Setting up Creed, connecting agents, and keeping context useful over time.
- [Stack](${base}/stack): The technology Creed runs on.

## Details

A personal context file is one structured profile that describes who you are and how you want AI to respond. Creed organizes it into ten sections: Identity, Goals, Work, Preferences, and Routines as the always-on core, plus optional Beliefs, Constraints, People, Health, and Context.

Agents connect over MCP (Claude Code, Codex, Cursor, ChatGPT) and read the file before answering, then propose narrowly scoped updates that you approve. The file is plain Markdown you own: bring your own AI key, keep your tokens, and export or delete everything at any time. There is no lock-in.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
