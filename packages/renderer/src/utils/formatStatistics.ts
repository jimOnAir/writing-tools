import type { IMessageStatistics } from '@writing-tools/shared';

/**
 * Format a number with commas as thousands separators
 */
const formatNumber = (num: number | undefined): string => {
  if (num === undefined) {
    return 'N/A';
  }

  return num.toLocaleString('en-US');
};

/**
 * Format nanoseconds to human-readable duration
 */
const formatDuration = (nanoseconds: number | undefined): string => {
  if (nanoseconds === undefined) {
    return 'N/A';
  }

  const milliseconds = nanoseconds / 1_000_000;
  const seconds = milliseconds / 1000;

  if (seconds >= 1) {
    return `${seconds.toFixed(2)}s`;
  }

  return `${milliseconds.toFixed(0)}ms`;
};

/**
 * Format tokens per second from token count and duration in nanoseconds
 */
const formatTokensPerSecond = (
  tokens: number | undefined,
  nanoseconds: number | undefined,
): string => {
  if (tokens === undefined || nanoseconds === undefined || nanoseconds === 0) {
    return 'N/A';
  }

  const tokensPerSecond = tokens / (nanoseconds / 1e9);

  return tokensPerSecond.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 1,
  });
};

/**
 * Format message statistics for display in tooltip
 */
export const formatStatistics = (statistics: IMessageStatistics): string => {
  const lines: string[] = [];

  if (statistics.model) {
    lines.push(`**Model:** ${statistics.model}`);
  }

  if (statistics.provider === 'ollama' && statistics.ollama) {
    const ollama = statistics.ollama;

    if (ollama.promptEvalCount !== undefined) {
      lines.push(`**Input Tokens:** ${formatNumber(ollama.promptEvalCount)}`);
    }

    if (ollama.evalCount !== undefined) {
      lines.push(`**Output Tokens:** ${formatNumber(ollama.evalCount)}`);
    }

    if (ollama.totalDuration !== undefined) {
      lines.push(`**Total Duration:** ${formatDuration(ollama.totalDuration)}`);
    }

    if (ollama.promptEvalDuration !== undefined) {
      lines.push(`**Prompt Eval Time:** ${formatDuration(ollama.promptEvalDuration)}`);
    }

    if (ollama.promptEvalCount !== undefined && ollama.promptEvalDuration !== undefined) {
      lines.push(`**Prompt Tokens/s:** ${formatTokensPerSecond(ollama.promptEvalCount, ollama.promptEvalDuration)}`);
    }

    if (ollama.evalDuration !== undefined) {
      lines.push(`**Generation Time:** ${formatDuration(ollama.evalDuration)}`);
    }

    if (ollama.evalCount !== undefined && ollama.evalDuration !== undefined) {
      lines.push(`**Output Tokens/s:** ${formatTokensPerSecond(ollama.evalCount, ollama.evalDuration)}`);
    }

    if (ollama.loadDuration !== undefined) {
      lines.push(`**Model Load Time:** ${formatDuration(ollama.loadDuration)}`);
    }
  } else if (statistics.provider === 'lmstudio' && statistics.lmstudio) {
    const lmstudio = statistics.lmstudio;

    if (lmstudio.promptTokens !== undefined) {
      lines.push(`**Input Tokens:** ${formatNumber(lmstudio.promptTokens)}`);
    }

    if (lmstudio.completionTokens !== undefined) {
      lines.push(`**Output Tokens:** ${formatNumber(lmstudio.completionTokens)}`);
    }

    if (lmstudio.totalTokens !== undefined) {
      lines.push(`**Total Tokens:** ${formatNumber(lmstudio.totalTokens)}`);
    }
  } else {
    // Unknown provider or missing statistics data
  }

  const date = new Date(statistics.generatedAt);
  lines.push(`**Generated:** ${date.toLocaleString()}`);

  return lines.join('\n\n');
};
