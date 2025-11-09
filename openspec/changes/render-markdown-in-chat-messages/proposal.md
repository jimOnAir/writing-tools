## Why
The chat interface currently displays plain text messages without rendering markdown formatting. Users often send messages that contain markdown elements like code blocks, bold text, lists, and links that should be properly formatted for better readability and user experience. Implementing markdown rendering will improve the visual presentation of chat messages.

## What Changes
- Add markdown rendering capability to the chat message display component
- Implement a markdown parser to convert markdown syntax to HTML elements
- Update the ChatComponent to render markdown content properly
- Preserve existing functionality while enhancing message display
- Ensure proper security handling for rendered markdown (sanitize HTML)
- Support common markdown elements: headers, bold, italic, lists, code blocks, links, strikethrough

## Impact
- Affected specs: desktop-app
- Affected code: packages/renderer/src/components/ChatComponent.tsx
