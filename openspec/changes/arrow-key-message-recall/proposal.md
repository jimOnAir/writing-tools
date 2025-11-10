# Arrow Key Message Recall

## Summary

Implement functionality to allow users to recall previously entered messages by pressing the up arrow key in the chat message input field.

## Problem

Currently, when users type messages in the chat input field and then want to reuse a previous message, they must manually retype it. This is inefficient and doesn't match common UI patterns found in chat applications.

## Solution

Add functionality to store previously entered messages and allow users to recall them using the up arrow key when the input field is focused.

## Acceptance Criteria

- When a user types a message and presses Enter, that message should be stored in a history
- When the user focuses on the input field and presses the up arrow key, the most recent message should be loaded into the input
- Pressing up arrow multiple times should cycle through previous messages
- The functionality should only be active when the input field is focused
- The functionality should not interfere with normal typing or other keyboard shortcuts

## Design Considerations

- Store message history in component state
- Limit history to a reasonable number of messages (e.g., 10)
- Handle edge cases like empty messages or when no history exists
- Maintain focus on the input field after recall
