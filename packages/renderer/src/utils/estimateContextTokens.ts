/**
 * Heuristic: ~4 characters per token (common for English and code).
 * Used to estimate context length for the UI indicator.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count from message contents and optional draft text.
 * Matches the payload that would be sent on Send: all messages + current input.
 */
export function estimateContextTokens(
  messages: ReadonlyArray<{ content: string }>,
  draftText: string = '',
): number {
  let totalChars = 0;
  for (const m of messages) {
    totalChars += m.content.length;
  }
  totalChars += draftText.length;
  return Math.max(0, Math.ceil(totalChars / CHARS_PER_TOKEN));
}
