// Page cursors: opaque to clients, and nothing more than a position in The Met's search results.

export function encodeCursor(offset: number): string {
  return Buffer.from(`offset:${offset}`).toString("base64url");
}

// Accepts only the exact encoding encodeCursor produces, so a hand-written value never decodes.
export function decodeCursor(cursor: string): number | null {
  const match = /^offset:(\d{1,5})$/.exec(Buffer.from(cursor, "base64url").toString());
  const offset = Number(match?.[1]);
  return match && encodeCursor(offset) === cursor ? offset : null;
}
