## Why
The writing assistance application requires improved chat window behavior to provide a better user experience. Currently, the chat window behavior is not well-defined, leading to inconsistent user interactions. This change will establish clear behavior for how the chat window opens, updates, reuses, and closes.

## What Changes
- Implement chat window opening behavior when user triggers the shortcut
- Add functionality to clear previous conversation and start new chat with latest selected text/prompt when window is already open
- Enforce single instance policy for chat window to avoid clutter
- Reuse the same window for all subsequent prompts maintaining consistent position and size
- Implement manual close and auto-hide functionality after inactivity

## Impact
- Affected specs: desktop-app
- Affected code: ChatComponent, window management utilities, global shortcut handlers
