# Design: Arrow Key Message Recall

## Overview

This design implements a feature that allows users to recall previously entered messages by pressing the up arrow key in the chat input field. The implementation will store message history in component state and provide cycling through messages when the up arrow key is pressed.

## Implementation Details

### State Management

We'll add a new state variable to store the message history:
- `messageHistory`: Array of strings containing previously entered messages
- `historyIndex`: Number to track current position in history when cycling

### Key Functions

1. **updateMessageHistory**: Function to add a new message to history (called when sending messages)
2. **handleUpArrowKey**: Function to handle up arrow key presses and recall messages
3. **limitHistory**: Function to ensure history doesn't exceed maximum size (10 messages)

### Integration Points

The feature will be integrated into:
- The existing `handleSendMessage` function to update history
- The existing `handleKeyPress` function to handle up arrow key presses
- The textarea's `onKeyDown` event handler

## Technical Approach

1. Add `messageHistory` and `historyIndex` state variables
2. Modify `handleSendMessage` to update message history when a message is sent
3. Add a new handler for up arrow key presses that cycles through history
4. Implement history limiting to prevent unlimited growth
5. Ensure proper focus management after message recall

## Edge Cases

- Empty messages should not be added to history
- When no history exists, up arrow should do nothing
- Cycling through history should wrap around properly
- When user types a new message after recalling one, it should be added to history
