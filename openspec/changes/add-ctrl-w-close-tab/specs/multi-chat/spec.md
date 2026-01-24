## ADDED Requirements

### Requirement: Keyboard Shortcut for Closing Tabs
The application SHALL support closing the currently active chat tab using Ctrl+W (Cmd+W on macOS) when the window is focused.

#### Scenario: Success case - Close active tab with keyboard shortcut
- **WHEN** user presses Ctrl+W (or Cmd+W on macOS) while the app has focus and an active chat tab exists
- **THEN** the currently active chat tab SHALL be closed
- **AND** a new empty tab SHALL be created if the last tab was closed

#### Scenario: Success case - No-op when no tabs exist
- **WHEN** user presses Ctrl+W (or Cmd+W on macOS) while the app has focus but there are no open tabs
- **THEN** no action SHALL occur

## MODIFIED Requirements

### Requirement: MultiChatService Event Listeners
The MultiChatService class SHALL properly initialize and clean up keyboard event listeners.

#### Scenario: Success case - Keyboard listener initialization
- **WHEN** MultiChatService.initializeListeners() is called
- **THEN** a document-level keydown listener for Ctrl+W/Cmd+W shortcuts SHALL be registered

#### Scenario: Success case - Keyboard listener cleanup
- **WHEN** MultiChatService.cleanupListeners() is called
- **THEN** the document-level keyboard event listener SHALL be removed

## REMOVED Requirements

### Requirement: Global Shortcut Handling (Legacy)
The application SHALL NOT register global system shortcuts for tab closing.

#### Reason:
This functionality was superseded by document-level keyboard handling which provides better user experience and follows platform conventions.
