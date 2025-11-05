# Desktop App Specification

## Overview

This specification defines the requirements for processing global shortcut presses to send clipboard text to Ollama and display the response in a chat window. This feature extends the existing global shortcut functionality to provide a seamless way to interact with local AI models.

## ADDED Requirements

### Requirement: Global Shortcut Processing

#### Scenario: Global shortcut triggers clipboard processing
- Given the user has configured a global shortcut
- And the user has text in their clipboard
- When the global shortcut is pressed
- Then the application should retrieve clipboard text
- And send it to Ollama with the configured prompt
- And open a chat window with the message and response

#### Scenario: No text in clipboard
- Given the user has configured a global shortcut
- When the global shortcut is pressed
- And there is no text in the clipboard
- Then the application should show an appropriate error message
- And not attempt to send anything to Ollama

#### Scenario: Ollama service unavailable
- Given the user has configured a global shortcut
- When the global shortcut is pressed
- And Ollama service is not available
- Then the application should show an error message
- And not attempt to open a chat window

### Requirement: Clipboard Integration

#### Scenario: Clipboard text retrieval
- Given the application is running
- When a global shortcut is pressed
- Then the application should retrieve text from the system clipboard
- And validate that text exists before proceeding

#### Scenario: Clipboard text handling
- Given clipboard text is retrieved
- When the text is sent to Ollama
- Then the text should be properly formatted for the AI model
- And any special characters should be handled correctly

### Requirement: Ollama Integration

#### Scenario: Ollama API call with custom prompt
- Given the user has configured a custom prompt
- When the global shortcut is pressed
- Then the application should send the clipboard text to Ollama
- And include the custom prompt in the request
- And handle the response appropriately

#### Scenario: Ollama response handling
- Given Ollama has processed the request
- When the response is received
- Then the application should update the chat window with the response
- And display the response in a readable format

### Requirement: Chat Window Management

#### Scenario: Chat window creation
- Given the global shortcut has been pressed and text sent to Ollama
- When the application processes the response
- Then a new chat window should be created
- And the window should be positioned appropriately

#### Scenario: Chat window content
- Given a chat window is open
- When the user views the window
- Then the window should display the original message from clipboard
- And the response from Ollama
- And the chat history should be properly formatted

### Requirement: Settings Integration

#### Scenario: Custom prompt configuration
- Given the application has settings interface
- When the user navigates to settings
- Then they should be able to configure a custom prompt for global shortcut usage
- And the configuration should be saved and applied

#### Scenario: Settings persistence
- Given the user has configured a custom prompt
- When the application is restarted
- Then the custom prompt should persist and remain active

## Implementation Details

### API Endpoints
- No new API endpoints required for this feature
- Existing IPC mechanisms will be used for communication with Ollama

### Data Structures
- Clipboard text will be passed as a string to the Ollama client
- Ollama response will be processed as a structured message
- Chat window state will be managed through the existing chat component

### Cross-Platform Support
- The implementation works across macOS, Windows, and Linux platforms
- Clipboard access is handled through platform-specific APIs
- Ollama server connectivity is handled through standard HTTP requests
- UI components follow platform-specific design guidelines

### Error Handling
- Invalid clipboard content is handled gracefully
- Connection timeouts to Ollama are handled with user feedback
- Network failures are logged but do not crash the application
- Error messages are user-friendly and actionable
- Invalid Ollama responses are handled gracefully

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
- All requirements from this specification have been met
