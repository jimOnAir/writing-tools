import { estimateContextTokens } from './estimateContextTokens';

describe('estimateContextTokens', () => {
  it('returns 0 for empty messages and no draft', () => {
    expect(estimateContextTokens([], '')).toBe(0);
  });

  it('estimates from message content (chars/4)', () => {
    expect(estimateContextTokens([{ content: 'abcd' }], '')).toBe(1);
    expect(estimateContextTokens([{ content: 'hello world' }], '')).toBe(3);
  });

  it('includes draft text in estimate', () => {
    expect(estimateContextTokens([], 'four')).toBe(1);
    expect(estimateContextTokens([{ content: 'hi' }], 'eight!')).toBe(2);
  });

  it('sums all messages and draft', () => {
    expect(
      estimateContextTokens(
        [{ content: 'aaaa' }, { content: 'bbbb' }],
        'cccc',
      ),
    ).toBe(3);
  });

  it('rounds up fractional tokens', () => {
    expect(estimateContextTokens([{ content: 'a' }], '')).toBe(1);
    expect(estimateContextTokens([{ content: 'ab' }], '')).toBe(1);
  });
});
