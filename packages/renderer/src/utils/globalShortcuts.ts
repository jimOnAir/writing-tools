import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

let platform = '';
await (async () => {
  const env = await window.electronAPI.invoke(EIpcChannel.ENV, { channel: EIpcChannel.ENV, event: EIpcEvent.ENV_GET, payload: {} });
  platform = env.platform;
})();

/**
 * Validates if a shortcut string is in a valid format for Electron accelerators
 * @param shortcut The shortcut string to validate
 * @returns boolean indicating if the shortcut is valid
 */
export const isValidShortcut = (shortcut: string): boolean => {
  if (!shortcut || typeof shortcut !== 'string') {
    return false;
  }

  const trimmedShortcut = shortcut.trim();
  if (!trimmedShortcut) {
    return false;
  }

  // Split by '+' and normalize each part
  const parts = trimmedShortcut.split('+').map(part => part.trim().toLowerCase());

  // Must have at least 2 parts (modifier + key)
  if (parts.length < 2) {
    return false;
  }

  if (parts.length > 4) {
    return false;
  }

  // Check that all parts are non-empty
  for (const part of parts) {
    if (!part) {
      return false;
    }
  }

  // Define valid modifiers and key codes
  const validModifiers = new Set([
    'command', 'cmd', 'control', 'ctrl', 'commandorcontrol', 'cmdorctrl',
    'alt', 'option', 'altgr', 'shift', 'super', 'meta',
  ]);

  const validKeyCodes = new Set([
    // Numbers
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    // Letters
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    // Function keys
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
    'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24',
    // Punctuation and special keys
    ')', '!', '@', '#', '$', '%', '^', '&', '*', '(', ':', ';', '+', '=', '<', ',', '_', '-', '>', '.', '?', '/', '~', '`', '{', ']', '[', '|', '\\', '}', '"',
    'plus', 'space', 'tab', 'capslock', 'numlock', 'scrolllock', 'backspace', 'delete', 'insert', 'return', 'enter', 'up', 'down', 'left', 'right',
    'home', 'end', 'pageup', 'pagedown', 'escape', 'esc', 'volumeup', 'volumedown', 'volumemute', 'medianexttrack', 'mediaprevioustrack', 'mediastop', 'mediaplaypause',
    'printscreen', 'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 'numdec', 'numadd', 'numsub', 'nummult', 'numdiv',
  ]);

  // Check each part
  let hasModifier = false;
  let hasKey = false;

  for (const part of parts) {
    if (validModifiers.has(part)) {
      hasModifier = true;
    } else if (validKeyCodes.has(part)) {
      hasKey = true;
    } else {
      // Invalid part
      return false;
    }
  }

  // Must have at least one modifier and one key
  return hasModifier && hasKey;
};

/**
 * Normalizes a shortcut string to a consistent format
 * @param shortcut The shortcut string to normalize
 * @returns normalized shortcut string
 */
export const normalizeShortcut = (shortcut: string): string => {
  if (!shortcut) {
    return '';
  }

  const trimmedShortcut = shortcut.trim();
  if (!trimmedShortcut) {
    return '';
  }

  // Split by '+' and normalize each part
  const parts = trimmedShortcut.split('+').map(part => part.trim().toLowerCase());

  // Normalize modifiers to their canonical forms
  const normalizedParts = parts.map(part => {
    switch (part) {
      case 'cmd': return 'command';
      case 'ctrl': return 'control';
      case 'cmdorctrl': return 'commandorcontrol';
      case 'option': return 'alt';
      case 'meta': return 'super';
      case 'enter': return 'return';
      case 'esc': return 'escape';
      default: return part;
    }
  });

  // Sort modifiers first, then key (standard Electron order)
  const modifiers: string[] = [];
  let key: string | null = null;

  for (const part of normalizedParts) {
    if (['command', 'control', 'commandorcontrol', 'alt', 'shift', 'super'].includes(part)) {
      modifiers.push(part);
    } else if (!key) {
      key = part;
    }
  }

  // Reconstruct with modifiers first, then key
  const sortedParts = [...modifiers];
  if (key) {
    sortedParts.push(key);
  }

  return sortedParts.join('+');
};

/**
 * Gets the cross-platform representation of a shortcut
 * @param shortcut The shortcut string
 * @returns Cross-platform representation
 */
export const getCrossPlatformShortcut = (shortcut: string): string => {
  if (!isValidShortcut(shortcut)) {
    return '';
  }

  const normalized = normalizeShortcut(shortcut);
  const parts = normalized.split('+');

  const crossPlatformParts = parts.map(part => {
    if (part === 'commandorcontrol') {
      return platform === 'darwin' ? 'command' : 'control';
    }

    return part;
  });

  return crossPlatformParts.join('+');
};
