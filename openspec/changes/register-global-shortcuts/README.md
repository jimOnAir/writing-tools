# Register Global Shortcuts

## Overview

This change implements the ability to register global keyboard shortcuts that can be used across all applications. When a user presses the registered shortcut, the application will retrieve the currently selected text from any application and display it in an alert.

## Features

1. **Global Shortcut Registration**: Users can configure keyboard shortcuts that work globally across all applications
2. **Text Capture**: When a shortcut is pressed, the application captures text from the active application
3. **Settings Persistence**: Configured shortcuts are saved and loaded between application restarts
4. **UI Configuration**: Dedicated settings section for managing global shortcuts

## Implementation Details

### Main Process
- Uses Electron's `globalShortcut` module to register and detect keyboard shortcuts
- Loads settings on startup to restore previously configured shortcuts
- Handles shortcut registration and unregistration

### Renderer Process
- Provides UI for configuring global shortcuts
- Displays captured text in an alert dialog when shortcut is triggered
- Manages settings persistence through IPC communication

### Settings Structure
The application settings now include a `globalShortcuts` array that stores:
```json
{
  "globalShortcuts": [
    {
      "key": "Ctrl+Shift+X",
      "enabled": true
    }
  ]
}
```

## Usage

1. Open the application settings
2. Navigate to the "Global Shortcuts" section
3. Enter a keyboard shortcut combination (e.g., Ctrl+Shift+X)
4. Click "Add Shortcut" to register it
5. When the shortcut is pressed in any application, the captured text will be displayed in an alert

## Cross-Platform Considerations

- macOS: Standard global shortcut registration
- Windows: Standard global shortcut registration
- Linux: May require additional configuration or permissions

## Limitations

- Text capture is currently implemented using clipboard reading, which works best when the user has manually copied text
- Some applications may not allow clipboard access for security reasons
- Global shortcuts may conflict with system shortcuts or other applications

## Future Enhancements

1. Implement more sophisticated text capture methods
2. Add support for multiple shortcut combinations
3. Provide more detailed error handling and user feedback
4. Add shortcut conflict detection
5. Support for custom alert dialog designs
