import { EStreamingErrorType } from '../enum/EStreamingErrorType';

const NETWORK_ERROR_PATTERNS = [
  'connection refused',
  'econnrefused',
  'enotfound',
  'etimedout',
  'fetch failed',
  'networkerror',
] as const;

/**
 * Classifies a streaming error message into NETWORK or STREAMING type.
 * Used to display contextual messages (e.g. connection issues vs generic errors).
 */
export function classifyStreamingError(errorMessage: string): EStreamingErrorType {
  const lower = errorMessage.toLowerCase();
  const isNetwork = NETWORK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));

  return isNetwork ? EStreamingErrorType.NETWORK : EStreamingErrorType.STREAMING;
}
