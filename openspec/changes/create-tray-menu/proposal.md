## Why
The writing assistance application needs a tray menu and the ability to close the app to the system tray. This will provide users with a more native desktop experience, allowing them to minimize the application to the system tray instead of closing it completely, and access application functions through a context menu in the system tray.

## What Changes
- Implement system tray functionality using Electron's Tray API
- Create a tray menu with options to restore the application, open settings, and quit
- Add functionality to minimize the main window to the tray when the user closes the window
- Update application lifecycle handling to support tray behavior
- Add necessary configuration for tray menu items
- Configure build process to copy tray icon assets during electron app building
- Ensure tray functionality works in both development and production modes
- Use appropriate app icon for system tray (logo192.png)
- Set application window icon to use the same logo192.png icon

## Impact
- Affected specs: desktop-app
- Affected code: Main process files, application lifecycle management, build configuration
