## Why
The writing assistance application needs a settings menu to configure Ollama-related parameters. Users should be able to set the Ollama address and model, with these configurations saved in a JSON file and loaded on application startup. Additionally, the application should be able to fetch and display the list of available models from Ollama.

## What Changes
- Implement a settings menu accessible from the system tray or application interface
- Add configuration options for Ollama address and model selection
- Create JSON file storage for settings with load/save functionality
- Implement functionality to fetch available models from Ollama
- Ensure settings are loaded on application startup
- Add proper error handling for Ollama connection issues

## Impact
- Affected specs: desktop-app
- Affected code: Main process files, renderer process files, configuration management
- New files: settings configuration file, settings UI components
