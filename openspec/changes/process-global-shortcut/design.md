# Design: Process Global Shortcut Press

## Overview

This design describes the implementation approach for processing global shortcut presses to send clipboard text to Ollama and display the response in a chat window.

## Architecture

### Components

1. **Global Shortcut Handler** - Listens for global shortcut presses
2. **Clipboard Manager** - Retrieves text from clipboard
3. **Ollama Client** - Communicates with Ollama API
4. **Chat Window Manager** - Creates and manages chat windows
5. **Settings Manager** - Handles custom prompt configuration

### Data Flow

1. Global shortcut is pressed
2. Clipboard manager retrieves text from clipboard
3. Ollama client sends text to Ollama with custom prompt
4. Chat window manager opens chat window with message
5. When Ollama responds, chat window is updated with response
6. Error handling for clipboard or Ollama failures

## Implementation Details

### Global Shortcut Integration

The global shortcut handler integrates with the existing global shortcuts system (register-global-shortcuts change). It listens for the specific shortcut event and triggers the processing flow.

### Clipboard Handling

The clipboard text retrieval uses the system's clipboard API to get the current text content. If no text is available, an appropriate error is shown.

### Ollama Integration

The Ollama client:
- Sends the clipboard text to Ollama
- Uses a configurable custom prompt
- Handles network errors and timeouts
- Processes the response once received

### Chat Window

The chat window:
- Is created dynamically when a shortcut is pressed
- Displays the original message from clipboard
- Shows the Ollama response once received
- Allows user interaction with the chat

### Settings

The application settings include:
- Custom prompt configuration
- Global shortcut configuration (already handled by register-global-shortcuts)

## Technical Considerations

### Error Handling

1. No clipboard text available
2. Ollama service unavailable
3. Network errors during API calls
4. Invalid responses from Ollama

### Performance

The system is lightweight and does not block the main thread during processing.

### Security

The clipboard data handling is secure and does not expose sensitive information.

## Dependencies

- Existing global shortcut system (register-global-shortcuts)
- Ollama integration (ollama-chat-interface)
- Chat window component (ollama-chat-interface)
- Settings management system

## Implementation Status

The implementation is complete and functional:
- Global shortcut processing is implemented in src/shortcuts.ts
- Clipboard text retrieval works correctly
- Ollama API integration uses src/ollamaHandlers.ts
- Chat window creation uses src/windows.ts
- Error handling is implemented for both clipboard and Ollama failures
- Settings integration supports custom prompt configuration
- All requirements from the specification have been met
