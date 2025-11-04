/**
 * Validates if a shortcut string is in a valid format
 * @param shortcut The shortcut string to validate
 * @returns boolean indicating if the shortcut is valid
 */
export const isValidShortcut = (shortcut: string): boolean => {
  if (!shortcut || typeof shortcut !== 'string') {
    return false;
  }

  // Basic validation - check if it contains at least one modifier key and a main key
  const parts = shortcut.trim().split('+');

  if (parts.length < 2) {
    return false;
  }

  // Check if all parts are non-empty
  for (const part of parts) {
    if (!part.trim()) {
      return false;
    }
  }

  return true;
};

/**
 * Normalizes a shortcut string to a consistent format
 * @param shortcut The shortcut string to normalize
 * @returns normalized shortcut string
 */
export const normalizeShortcut = (shortcut: string): string => {
  if (!shortcut) return '';

  return shortcut.trim();
};
