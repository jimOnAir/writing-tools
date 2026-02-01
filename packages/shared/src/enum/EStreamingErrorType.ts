/**
 * Error type classification for streaming errors passed to the UI.
 * Used to display contextual messages (e.g. connection issues vs generic errors).
 */
export enum EStreamingErrorType {
  /** Connection/network failure (e.g. fetch failed, ECONNREFUSED) */
  NETWORK = 'NETWORK',
  /** Generic streaming error */
  STREAMING = 'STREAMING',
}
