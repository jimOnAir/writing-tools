/**
 * Statistics about LLM message generation
 * Different providers return different statistics
 */
export interface IMessageStatistics {
  /**
   * The LLM provider that generated this message
   */
  provider: 'ollama' | 'lmstudio';

  /**
   * Model name used for generation
   */
  model?: string;

  /**
   * Timestamp when the message was generated
   */
  generatedAt: Date;

  /**
   * Ollama-specific statistics
   */
  ollama?: {
    /**
     * Total duration in nanoseconds
     */
    totalDuration?: number,

    /**
     * Model load duration in nanoseconds
     */
    loadDuration?: number,

    /**
     * Number of tokens in the prompt (input)
     */
    promptEvalCount?: number,

    /**
     * Time taken to evaluate the prompt in nanoseconds
     */
    promptEvalDuration?: number,

    /**
     * Number of tokens generated (output)
     */
    evalCount?: number,

    /**
     * Time taken to generate output tokens in nanoseconds
     */
    evalDuration?: number,
  };

  /**
   * LM Studio (OpenAI-compatible) statistics
   */
  lmstudio?: {
    /**
     * Number of tokens in the prompt
     */
    promptTokens?: number,

    /**
     * Number of tokens in the completion
     */
    completionTokens?: number,

    /**
     * Total tokens (prompt + completion)
     */
    totalTokens?: number,
  };
}
