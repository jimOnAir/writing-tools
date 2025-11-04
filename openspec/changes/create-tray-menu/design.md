# Design: System Tray Integration

## Overview
This document outlines the design for implementing system tray functionality in the writing assistance application. The implementation will use Electron's Tray API to provide users with a native desktop experience that includes a system tray icon, context menu, and the ability to minimize the application to the tray instead of closing it completely.

## Architecture

### Main Process Changes
The main process will be modified to:
1. Create and manage a Tray instance
2. Implement tray menu with restore, settings, and quit options
3. Handle window lifecycle events for tray integration
4. Manage application quit behavior when using tray functionality

### Platform Considerations
- **Windows**: Use appropriate tray icons and context menu
- **macOS**: Follow macOS guidelines for menu bar icons and behavior
- **Linux**: Use standard tray icon conventions

## Implementation Details

### Tray Icon Management
- Use appropriate icon files for each platform (PNG format)
- Use logo192.png as the primary tray icon
- Implement different icons for different states (normal, active, etc.)
- Handle icon loading and error cases gracefully

### Window Icon Management
- Set the main application window icon to logo192.png for consistency
- Maintain icon consistency between window and tray for better user experience

### Tray Menu Structure
The tray menu will include:
1. **Restore** - Bring the main window back from the tray
2. **Settings** - Open the application settings dialog
3. **Quit** - Exit the application completely

### Window Management
When the user attempts to close the main window:
1. Check if tray functionality is enabled
2. If enabled, minimize the window to the tray instead of closing
3. If disabled, allow normal window closing behavior

### Application Lifecycle
The application will handle different exit scenarios:
1. User clicks quit from tray menu
2. User closes window with tray enabled
3. System shutdown or forced quit

## Technical Approach

### Dependencies
- Electron's built-in Tray and Menu APIs
- Platform-specific icon handling

### File Structure
- Main process modifications in main.ts (or main.js)
- Tray icon assets in appropriate directories
- Configuration for tray behavior
- Build configuration to copy assets during electron app building

### Build Process Integration
The tray icon assets need to be copied during the build process to ensure they are available at runtime. This will be handled through the electron-builder configuration or build scripts to include the icon files in the packaged application.

### Development Mode Support
The implementation supports both development and production modes:
- In development mode, tray icons are loaded from the public directory
- In production mode, tray icons are loaded from the dist directory
- This ensures the tray functionality works correctly in both environments

## Integration Points
This change integrates with the existing desktop application structure and will work alongside the current window management system.

## Testing Strategy
- Verify tray icon appears correctly on all platforms
- Test all menu item actions
- Confirm window minimize/restore behavior
- Validate application quit functionality
- Test edge cases like multiple windows or unexpected states
