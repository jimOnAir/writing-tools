/**
 * Type guards for IPC response checking
 * These functions provide type-safe ways to check if a response is an error response
 */

/**
 * Type guard to check if a response has an error property
 * @param response - The response object to check
 * @returns True if the response has an error property with a string value
 */
export const isErrorResponse = (response: unknown): response is { error: string } => {
  return typeof response === 'object' && response !== null && 'error' in response && typeof (response as { error: unknown }).error === 'string';
};

/**
 * Type guard to check if a response is a failed response with success: false
 * @param response - The response object to check
 * @returns True if the response has success: false and an error property with a string value
 */
export const isFailedResponse = (response: unknown): response is { error: string, success: false } => {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const obj = response as Record<string, unknown>;

  return 'success' in obj && obj.success === false && 'error' in obj && typeof obj.error === 'string';
};
