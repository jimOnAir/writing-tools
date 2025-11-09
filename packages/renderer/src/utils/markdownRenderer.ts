import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders markdown content as safe HTML
 * @param markdown - The markdown string to render
 * @returns Safe HTML string
 */
export const renderMarkdown = (markdown: string): string => {
  // Convert markdown to HTML with additional configuration for better styling
  const html = marked.parse(markdown, {
    async: false,
    // Add options to ensure proper HTML structure for styling
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Convert line breaks to <br> tags
  });

  // Sanitize the HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(html);

  return sanitizedHtml;
};
