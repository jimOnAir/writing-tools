# Process Global Shortcut Press

## Summary

This change implements functionality to process global shortcut presses. When the configured global shortcut is pressed, the application will:
1. Retrieve text from the clipboard
2. Send it to Ollama with a custom prompt
3. Open a chat window populated with the message and Ollama's response

## Requirements

### ADDED Requirements

#### Scenario: Global shortcut triggers Ollama processing
- Given the user has configured a global shortcut
- And the user has text in their clipboard
- When the global shortcut is pressed
- Then the application should retrieve clipboard text
- And send it to Ollama with the configured prompt
- And open a chat window with the message and response

#### Scenario: Ollama response is received
- Given a global shortcut has been pressed
- And the text has been sent to Ollama
- When Ollama responds
- Then the chat window should be updated with the response

#### Scenario: No text in clipboard
- Given the user has configured a global shortcut
- When the global shortcut is pressed
- And there is no text in the clipboard
- Then the application should show an appropriate error message

#### Scenario: Ollama service unavailable
- Given the user has configured a global shortcut
- When the global shortcut is pressed
- And Ollama service is not available
- Then the application should show an error message

## Acceptance Criteria

- Global shortcut is properly registered and detected
- Clipboard text is correctly retrieved
- Ollama API is called with proper prompt
- Chat window opens with correct message and response
- Error handling for various failure scenarios
- No impact on existing application functionality

## Implementation Status

The implementation is complete and functional:
- Global shortcut processing is implemented in src/shortcuts.ts
- Clipboard text retrieval works correctly
- Ollama API integration uses src/ollamaHandlers.ts
- Chat window creation uses src/windows.ts
- Error handling is implemented for both clipboard and Ollama failures
- Settings integration supports custom prompt configuration
- All requirements have been met
