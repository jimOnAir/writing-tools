import { execSync } from 'child_process';
import os from 'os';

import { TextSelectionService } from './TextSelectionService';

// Mock child_process and os
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('os', () => ({
  platform: jest.fn(),
}));

describe('TextSelectionService', () => {
  let textSelectionService: TextSelectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    textSelectionService = new TextSelectionService();
  });

  describe('getSelectedText', () => {
    it('returns selected text on Windows', () => {
      (os.platform as jest.Mock).mockReturnValue('win32');
      (execSync as jest.Mock).mockReturnValue('Selected text on Windows');

      const result = textSelectionService.getSelectedText();

      expect(result).toBe('Selected text on Windows');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('powershell'),
        { encoding: 'utf8' },
      );
    });

    it('returns selected text on macOS', () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (execSync as jest.Mock).mockReturnValue('Selected text on macOS');

      const result = textSelectionService.getSelectedText();

      expect(result).toBe('Selected text on macOS');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('osascript'),
        { encoding: 'utf8' },
      );
    });

    it('returns selected text on Linux', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (execSync as jest.Mock).mockReturnValue('Selected text on Linux');

      const result = textSelectionService.getSelectedText();

      expect(result).toBe('Selected text on Linux');
      expect(execSync).toHaveBeenCalledWith(
        'xclip -o -selection primary',
        { encoding: 'utf8' },
      );
    });

    it('returns null for unsupported platform', () => {
      (os.platform as jest.Mock).mockReturnValue('unknown');

      const result = textSelectionService.getSelectedText();

      expect(result).toBeNull();
    });

    it('handles errors gracefully', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = textSelectionService.getSelectedText();

      expect(result).toBeNull();
    });

    it('returns null for empty result', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (execSync as jest.Mock).mockReturnValue('   ');

      const result = textSelectionService.getSelectedText();

      expect(result).toBeNull();
    });

    it('trims whitespace from result', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (execSync as jest.Mock).mockReturnValue('  Selected text  ');

      const result = textSelectionService.getSelectedText();

      expect(result).toBe('Selected text');
    });
  });
});
