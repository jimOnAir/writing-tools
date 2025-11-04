# Register Global Shortcuts

## Summary

This change implements the ability to register global keyboard shortcuts that can be used across all applications. When a user presses the registered shortcut, the application will retrieve the currently selected text from any application and display it in an alert.

## Why

This feature enhances user productivity by allowing quick access to text capture functionality from any application using a global keyboard shortcut. Users can quickly extract text without needing to manually copy and paste, especially useful when working with multiple applications.

## What Changes

- Add a new section in the settings menu for global shortcuts configuration
- Implement global shortcut registration using Electron's globalShortcut module
- Add capability to capture selected text from any active application
- Implement clipboard-based text retrieval for cross-platform compatibility
- Add settings persistence for registered shortcuts
- Create UI for configuring and saving shortcut combinations

## Impact

- Affected specs: desktop-app/spec.md (adds new requirements)
- Affected code:
  - New UI components for global shortcuts in settings
  - Main process modifications for global shortcut handling
  - Text capture functionality for retrieving selected text
  - Settings persistence logic

## Requirements

### ADDED Requirements

#### Scenario: User registers a global shortcut
- Given the application is running
- When the user navigates to the settings menu
- And selects the global shortcuts option
- And enters a keyboard shortcut (e.g., Ctrl+Shift+X)
- Then the shortcut should be registered globally
- And the application should be able to detect when this shortcut is pressed

#### Scenario: Global shortcut triggers
- Given a global shortcut has been registered
- When the user presses the registered shortcut combination
- Then the application should capture the currently selected text from the active application
- And display the captured text in an alert dialog

#### Scenario: Text retrieval from any application
- Given a global shortcut has been registered and triggered
- When the application captures selected text
- Then it should retrieve text from any application (browser, word processor, etc.)
- And display it in an alert dialog

#### Scenario: Settings persistence
- Given the application has been configured with a global shortcut
- When the application is restarted
- Then the registered shortcut should persist and remain active

## Acceptance Criteria

- Global shortcuts can be configured through the settings interface
- The application can register and detect global keyboard shortcuts
- Selected text from any application can be captured when shortcut is pressed
- Settings are persisted between application restarts
- Error handling for invalid shortcut combinations
