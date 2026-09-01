type DatedStoryItem = { id: string; createdAt: Date };

export function interleaveStoryItems<JournalEntry extends DatedStoryItem, Decision extends DatedStoryItem>(
  entries: JournalEntry[],
  decisions: Decision[],
): Array<(JournalEntry & { type: "journal-entry" }) | (Decision & { type: "decision" })> {
  return [
    ...entries.map((entry) => ({ ...entry, type: "journal-entry" as const })),
    ...decisions.map((decision) => ({ ...decision, type: "decision" as const })),
  ].sort((left, right) => {
    const byDate = right.createdAt.getTime() - left.createdAt.getTime();
    return byDate || right.id.localeCompare(left.id);
  });
}
