// Canonical FAQ content for the public site. Shared by the visible FAQ on
// /home (components/marketing/below-hero-sections.tsx) and the FAQPage
// JSON-LD that ships on the same page (lib/seo/structured-data.ts). Keeping
// one source means the structured data can never drift from the rendered
// answers, which is exactly what search and AI engines check for.

export type FaqItem = {
  question: string;
  answer: string;
};

export const homeFaqItems: FaqItem[] = [
  {
    question: "What actually goes in a Creed?",
    answer:
      "Who you are, what you're working toward, how you like AI to talk to you, the people and routines that shape your week, plus any health, accessibility, or hard noes AI should respect. One concise profile, not a journal.",
  },
  {
    question: "Why not just retell every AI who I am each time?",
    answer:
      "Because it doesn't stick, doesn't cross tools, and you end up repeating yourself. Creed gives every AI the same profile to read before answering, and lets them propose updates as they learn more about you.",
  },
  {
    question: "Which tools does Creed work with?",
    answer:
      "Creed is built for tools like Claude Code, Codex, Hermes, OpenClaw, and custom agents. Support for tools like Notion and Obsidian is coming for editing and storage.",
  },
  {
    question: "What gets written back to Creed?",
    answer:
      "Durable things AI learns about you, a sharper preference, a new routine, a goal that shifted. Not session recap, not mood, not generic praise.",
  },
  {
    question: "Do I have to review every change?",
    answer:
      "No. You can keep agent edits reviewable, or trust them to write directly when you want a lighter loop. The point is control when you want it, not friction by default.",
  },
  {
    question: "Is Creed for teams or just for me?",
    answer: "Creed is a personal profile. A team version is in the works.",
  },
];

// FAQ for the /context explainer. Phrased as direct, standalone answers
// so answer engines can quote a single item without surrounding context.
export const contextFileFaqItems: FaqItem[] = [
  {
    question: "What is a personal context file?",
    answer:
      "A personal context file is one structured profile that describes who you are and how you want AI to work with you. Every AI tool you connect reads it before it answers, so your context stays consistent across tools and sessions instead of being re-explained each time.",
  },
  {
    question: "How is a personal context file different from a chatbot's memory?",
    answer:
      "Chatbot memory lives inside one app and cannot move with you. A personal context file is one portable file you own. It works across every agent you connect, and you can read, edit, or export it as plain Markdown at any time.",
  },
  {
    question: "How do agents keep a personal context file updated?",
    answer:
      "As an agent learns something durable about you, a sharper preference, a new routine, or a goal that shifted, it proposes a narrow update. You approve what stays, or let trusted agents edit directly. Session chatter and one-off details are left out by design.",
  },
  {
    question: "What goes in a personal context file?",
    answer:
      "Creed organizes it into ten sections: Identity, Goals, Work, Preferences, and Routines as the always-on core, plus optional Beliefs, Constraints, People, Health, and Context. Each section is short, specific, and written to change how AI responds.",
  },
  {
    question: "Which tools does a personal context file work with?",
    answer:
      "Creed connects to agents like Claude Code, Codex, Cursor, and ChatGPT over MCP, and integrates with GitHub for version control. Support for Notion and Obsidian is on the way.",
  },
  {
    question: "Do I own my personal context file?",
    answer:
      "Yes. Creed is plain Markdown that you control. You bring your own AI key, your tokens stay yours, and deleting your account wipes everything. There is no lock-in.",
  },
];
