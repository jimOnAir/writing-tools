export class LlmStreamingError extends Error {
  public readonly fullContent: string;

  public constructor(message: string, fullContent: string) {
    super(message);
    this.name = 'LlmStreamingError';
    this.fullContent = fullContent;
  }
}
