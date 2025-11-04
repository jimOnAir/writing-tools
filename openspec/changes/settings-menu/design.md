# Design: Settings Menu Implementation

## Overview
This document outlines the design for implementing a settings menu in the writing assistance application. The settings menu will allow users to configure Ollama address and model selection, with configurations saved in a JSON file and loaded on application startup. The application will also fetch and display available models from Ollama.

## Architecture

### Configuration Management
The application will use a configuration file (settings.json) to store user preferences. This file will be loaded at application startup and saved when settings are changed.

### Main Process Changes
The main process will be modified to:
1. Load settings from JSON file on application startup
2. Save settings to JSON file when changed
3. Provide API endpoints for Ollama model listing
4. Handle settings dialog opening from tray menu

### Renderer Process Changes
The renderer process will be modified to:
1. Display settings dialog/component
2. Handle user input for Ollama address and model selection
3. Communicate with main process for saving settings and fetching models

## Implementation Details

### Settings File Structure
The settings will be stored in a JSON file with the following structure:
```json
{
  "ollama": {
    "address": "http://localhost:11434",
    "model": "llama3"
  }
}
```

### Ollama Integration
The application will communicate with Ollama through HTTP requests to fetch available models. The API endpoint for listing models is `/api/tags`.

### Settings UI Components
The settings dialog will include:
1. Ollama address input field (text input)
2. Model selection dropdown (populated with available models from Ollama)
3. Save and Cancel buttons

### Tray Integration
The system tray menu will include a "Settings" option that opens the settings dialog.

## Technical Approach

### Dependencies
- Node.js file system module for JSON file operations
- HTTP client for Ollama API communication
- Electron's ipcMain/ipcRenderer for inter-process communication

### File Structure
- Settings configuration file (settings.json)
- Settings dialog component (renderer process)
- Settings management logic (main process)

### Error Handling
The application will implement proper error handling for:
- Missing or invalid settings file
- Ollama connection failures
- Invalid Ollama address or model

### Platform Considerations
The settings file will be stored in the application's data directory, which is platform-specific but consistent across platforms.

## Integration Points
This change integrates with the existing desktop application structure and will work alongside the current system tray functionality.

## Testing Strategy
- Verify settings file is created and loaded correctly
- Test settings saving and loading functionality
- Confirm Ollama model fetching works properly
- Validate UI interactions in settings dialog
- Test error handling scenarios
