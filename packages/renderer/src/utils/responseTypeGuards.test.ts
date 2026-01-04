import { isErrorResponse, isFailedResponse } from './responseTypeGuards';

describe('responseTypeGuards', () => {
  describe('isErrorResponse', () => {
    it('returns true for error response with string error', () => {
      const response = { error: 'Test error' };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('returns false for response without error property', () => {
      const response = { data: 'test' };
      expect(isErrorResponse(response)).toBe(false);
    });

    it('returns false for response with non-string error', () => {
      const response = { error: 123 };
      expect(isErrorResponse(response)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isErrorResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isErrorResponse(undefined)).toBe(false);
    });

    it('returns false for primitive types', () => {
      expect(isErrorResponse('string')).toBe(false);
      expect(isErrorResponse(123)).toBe(false);
      expect(isErrorResponse(true)).toBe(false);
    });

    it('returns false for array', () => {
      expect(isErrorResponse([])).toBe(false);
    });

    it('returns true for error response with additional properties', () => {
      const response = { error: 'Test error', code: 500 };
      expect(isErrorResponse(response)).toBe(true);
    });
  });

  describe('isFailedResponse', () => {
    it('returns true for failed response with success: false and error', () => {
      const response = { success: false, error: 'Test error' };
      expect(isFailedResponse(response)).toBe(true);
    });

    it('returns false for success response', () => {
      const response = { success: true };
      expect(isFailedResponse(response)).toBe(false);
    });

    it('returns false for response without success property', () => {
      const response = { error: 'Test error' };
      expect(isFailedResponse(response)).toBe(false);
    });

    it('returns false for response with success: false but no error', () => {
      const response = { success: false };
      expect(isFailedResponse(response)).toBe(false);
    });

    it('returns false for response with success: false but non-string error', () => {
      const response = { success: false, error: 123 };
      expect(isFailedResponse(response)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isFailedResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFailedResponse(undefined)).toBe(false);
    });

    it('returns false for primitive types', () => {
      expect(isFailedResponse('string')).toBe(false);
      expect(isFailedResponse(123)).toBe(false);
      expect(isFailedResponse(true)).toBe(false);
    });

    it('returns false for array', () => {
      expect(isFailedResponse([])).toBe(false);
    });

    it('returns true for failed response with additional properties', () => {
      const response = { success: false, error: 'Test error', code: 500 };
      expect(isFailedResponse(response)).toBe(true);
    });
  });
});
