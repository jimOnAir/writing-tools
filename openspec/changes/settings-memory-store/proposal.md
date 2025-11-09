## Why
The writing assistance application currently loads settings from disk on every access and saves them to disk on every change. This approach can be inefficient, especially when settings are accessed frequently. To improve performance and provide a better user experience, we need to implement an in-memory settings store that:

1. Reads settings from disk on application startup and stores them in memory
2. Provides fast access to settings from memory instead of disk
3. Writes settings to disk asynchronously when they change
4. Ensures data consistency between memory and disk

## What Changes
- Implement an in-memory settings store that loads settings on application startup
- Modify the settings loading/saving functions to work with the in-memory store
- Make file I/O operations asynchronous to prevent blocking the main thread
- Ensure settings are written to disk asynchronously when changed
- Maintain backward compatibility with existing settings file format

## Impact
- Affected specs: desktop-app
- Affected code: Main process files, specifically settings management
- New files: None (modifies existing settings.ts)
- Dependencies: None additional

## Acceptance Criteria
- Settings are loaded from disk once on application startup and stored in memory
- Settings can be accessed quickly from memory
- Settings changes are written to disk asynchronously
- Application startup time is improved due to reduced disk I/O
- Settings persistence is maintained correctly
- Error handling for file operations is preserved
