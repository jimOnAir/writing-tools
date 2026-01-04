// Mock electronAPI before importing the module
const mockElectronAPI = {
  invoke: jest.fn().mockResolvedValue({ platform: 'darwin' }),
};

Object.defineProperty(globalThis, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
});

// Import after mocking
import { getCrossPlatformShortcut, initializePlatform, isValidShortcut, normalizeShortcut, resetPlatform } from './globalShortcuts';

describe('globalShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPlatform();
  });

  describe('isValidShortcut', () => {
    it('returns true for valid shortcuts with command modifier', () => {
      expect(isValidShortcut('Command+A')).toBe(true);
      expect(isValidShortcut('Command+Shift+S')).toBe(true);
    });

    it('returns true for valid shortcuts with control modifier', () => {
      expect(isValidShortcut('Control+C')).toBe(true);
      expect(isValidShortcut('Ctrl+V')).toBe(true);
    });

    it('returns true for valid shortcuts with alt modifier', () => {
      expect(isValidShortcut('Alt+F4')).toBe(true);
      expect(isValidShortcut('Option+Tab')).toBe(true);
    });

    it('returns true for valid shortcuts with function keys', () => {
      expect(isValidShortcut('Command+F1')).toBe(true);
      expect(isValidShortcut('Control+F12')).toBe(true);
    });

    it('returns true for valid shortcuts with special keys', () => {
      expect(isValidShortcut('Command+Space')).toBe(true);
      expect(isValidShortcut('Control+Enter')).toBe(true);
      expect(isValidShortcut('Alt+Escape')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidShortcut('')).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isValidShortcut(null as unknown as string)).toBe(false);
      expect(isValidShortcut(undefined as unknown as string)).toBe(false);
      const numberValue = 123;
      expect(isValidShortcut(numberValue as unknown as string)).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isValidShortcut('   ')).toBe(false);
    });

    it('returns false for shortcut with only one part', () => {
      expect(isValidShortcut('A')).toBe(false);
      expect(isValidShortcut('Command')).toBe(false);
    });

    it('returns false for shortcut with more than 4 parts', () => {
      expect(isValidShortcut('Command+Control+Alt+Shift+A')).toBe(false);
    });

    it('returns false for shortcut with empty parts', () => {
      expect(isValidShortcut('Command++A')).toBe(false);
      expect(isValidShortcut('Command+A+')).toBe(false);
    });

    it('returns false for shortcut without modifier', () => {
      expect(isValidShortcut('A+B')).toBe(false);
    });

    it('returns false for shortcut without key', () => {
      expect(isValidShortcut('Command+Control')).toBe(false);
    });

    it('returns false for shortcut with invalid key', () => {
      expect(isValidShortcut('Command+InvalidKey')).toBe(false);
    });

    it('handles case-insensitive shortcuts', () => {
      expect(isValidShortcut('COMMAND+A')).toBe(true);
      expect(isValidShortcut('command+a')).toBe(true);
      expect(isValidShortcut('Command+A')).toBe(true);
    });

    it('handles shortcuts with extra whitespace', () => {
      expect(isValidShortcut('  Command  +  A  ')).toBe(true);
    });
  });

  describe('normalizeShortcut', () => {
    it('normalizes cmd to command', () => {
      expect(normalizeShortcut('Cmd+A')).toBe('command+a');
    });

    it('normalizes ctrl to control', () => {
      expect(normalizeShortcut('Ctrl+C')).toBe('control+c');
    });

    it('normalizes cmdorctrl to commandorcontrol', () => {
      expect(normalizeShortcut('CmdOrCtrl+V')).toBe('commandorcontrol+v');
    });

    it('normalizes option to alt', () => {
      expect(normalizeShortcut('Option+Tab')).toBe('alt+tab');
    });

    it('normalizes meta to super', () => {
      expect(normalizeShortcut('Meta+W')).toBe('super+w');
    });

    it('normalizes enter to return', () => {
      expect(normalizeShortcut('Command+Enter')).toBe('command+return');
    });

    it('normalizes esc to escape', () => {
      expect(normalizeShortcut('Alt+Esc')).toBe('alt+escape');
    });

    it('sorts modifiers before key', () => {
      expect(normalizeShortcut('A+Command')).toBe('command+a');
      expect(normalizeShortcut('Shift+Command+A')).toBe('shift+command+a');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeShortcut('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeShortcut('   ')).toBe('');
    });

    it('handles multiple modifiers', () => {
      expect(normalizeShortcut('Command+Shift+A')).toBe('command+shift+a');
      expect(normalizeShortcut('Control+Alt+Delete')).toBe('control+alt+delete');
    });

    it('preserves key when modifiers are normalized', () => {
      expect(normalizeShortcut('Cmd+Ctrl+A')).toBe('command+control+a');
    });
  });

  describe('getCrossPlatformShortcut', () => {
    beforeEach(async () => {
      // Initialize platform before each test
      await initializePlatform();
    });

    it('returns empty string for invalid shortcut', () => {
      expect(getCrossPlatformShortcut('Invalid')).toBe('');
      expect(getCrossPlatformShortcut('')).toBe('');
    });

    it('converts commandorcontrol to command on darwin', () => {
      // Mock platform as darwin (already set in mock)
      const result = getCrossPlatformShortcut('CommandOrControl+C');
      expect(result).toContain('command');
      expect(result).not.toContain('commandorcontrol');
    });

    it('preserves command modifier', () => {
      const result = getCrossPlatformShortcut('Command+A');
      expect(result).toBe('command+a');
    });

    it('preserves control modifier', () => {
      const result = getCrossPlatformShortcut('Control+C');
      expect(result).toBe('control+c');
    });

    it('normalizes shortcut before converting', () => {
      const result = getCrossPlatformShortcut('CmdOrCtrl+V');
      expect(result).toContain('command');
      expect(result).not.toContain('cmdorctrl');
    });

    it('handles complex shortcuts', () => {
      const result = getCrossPlatformShortcut('Command+Shift+S');
      expect(result).toBe('command+shift+s');
    });
  });
});
