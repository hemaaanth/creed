// Section mentions for Panel's Ask and Agent inputs. Typing "@" starts a
// mention and the input shows an autocomplete of sections; picking one inserts
// a chip. Caret detection lives inline in the input component (it works against
// the live contentEditable DOM); this module holds the one pure piece worth
// isolating - ranking sections against the partial query - so it stays testable.

export type MentionSection = {
  id: string;
  name: string;
};

const norm = (value: string) => value.toLowerCase();

// Rank sections for the autocomplete against a partial mention query. Empty
// query returns all sections in their given order (so "@" alone lists
// everything); otherwise prefix matches rank above substring matches, both
// space-insensitive so "pj" won't match but "product j" will.
export function rankMentionSections<T extends MentionSection>(
  sections: readonly T[],
  query: string
): T[] {
  const q = norm(query.trim());
  if (!q) return [...sections];
  const scored: Array<{ section: T; score: number }> = [];
  for (const section of sections) {
    const name = norm(section.name);
    if (name.startsWith(q)) scored.push({ section, score: 2 });
    else if (name.includes(q)) scored.push({ section, score: 1 });
  }
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.section);
}
