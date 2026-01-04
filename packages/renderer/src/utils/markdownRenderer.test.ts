import { renderMarkdown } from './markdownRenderer';

describe('renderMarkdown', () => {
  it('should render plain text as is', () => {
    const result = renderMarkdown('Hello world');
    expect(result).toBe('<p>Hello world</p>\n');
  });

  it('should render bold text', () => {
    const result = renderMarkdown('Hello **world**');
    expect(result).toBe('<p>Hello <strong>world</strong></p>\n');
  });

  it('should render italic text', () => {
    const result = renderMarkdown('Hello *world*');
    expect(result).toBe('<p>Hello <em>world</em></p>\n');
  });

  it('should render headers', () => {
    const result = renderMarkdown('# Header');
    expect(result).toContain('<h1>Header</h1>');
  });

  it('should render lists', () => {
    const result = renderMarkdown('- Item 1\n- Item 2');
    expect(result).toBe('<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>\n');
  });

  it('should render code blocks', () => {
    const result = renderMarkdown('```js\nconsole.log("hello");\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code');
  });

  it('should sanitize HTML to prevent XSS', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    // DOMPurify correctly removes script tags for security
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert("xss")');
  });
});
