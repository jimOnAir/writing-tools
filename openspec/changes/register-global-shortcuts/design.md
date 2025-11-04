# Global Shortcuts Design

## Overview

This document outlines the design for implementing global keyboard shortcuts in the Electron application. The solution will allow users to register custom keyboard shortcuts that trigger text capture from any active application.

## Architecture

### Components

1. **Settings UI** - New section in the settings menu for global shortcuts configuration
2. **Main Process** - Handles global shortcut registration and detection using Electron's globalShortcut module
3. **Text Capture Logic** - Mechanism to retrieve selected text from the active application
4. **Settings Persistence** - Storage and retrieval of shortcut configurations

### Data Flow

1. User configures a global shortcut in Settings UI
2. Configuration is saved to settings.json
3. Main process loads shortcuts on startup and registers them globally
4. When shortcut is pressed, main process captures text from active application
5. Captured text is displayed in an alert dialog

## Implementation Details

### Global Shortcut Registration

The Electron `globalShortcut` module will be used to register and detect keyboard shortcuts. This module allows registering shortcuts that work even when the application is not focused.

### Text Retrieval

For cross-platform text retrieval, we'll use a combination of:
- Clipboard-based approach (most reliable across platforms)
- Platform-specific APIs where needed

### Settings Management

Settings will be persisted in `app-data/settings.json` and loaded at application startup. The settings structure will include a `globalShortcuts` property to store registered shortcuts.

## Cross-Platform Considerations

- macOS: Standard global shortcut registration
- Windows: Standard global shortcut registration
- Linux: May require additional configuration or permissions

## Error Handling

The implementation will include:
- Validation of shortcut combinations
- Handling of duplicate shortcut registrations
- Graceful degradation when text capture fails
- User feedback for configuration errors
