# Prompt Selector Window

## Summary

Modify the global shortcut behavior to show a prompt selection window instead of directly executing a single preconfigured prompt. This window will allow users to either enter a custom prompt or select from preconfigured prompts.

## Requirements

### ADDED Requirements

#### Scenario: Prompt Selection Window Display

- When the global shortcut is pressed, a new window should be displayed instead of directly executing the prompt
- The window must contain:
  - A text area for entering custom prompts
  - Buttons for preconfigured prompts (configurable in settings)
  - Window size computed based on number of buttons
- After selecting or entering a prompt, the chat window should be shown as usual
- The selected/entered prompt must be sent to ollama as before

#### Scenario: Preconfigured Prompt Configuration

- Preconfigured prompts should be configurable in settings
- Each preconfigured prompt should include:
  - Title (display name)
  - Icon (optional)
  - Prompt text
- Settings should support multiple preconfigured prompts

#### Scenario: Settings Integration

- Settings should be updated to include a new field for preconfigured prompts
- No backward compatibility needed for existing settings

### MODIFIED Requirements

#### Scenario: Global Shortcut Behavior

- The global shortcut handler should be modified to show the prompt selection window instead of directly executing the prompt
- The prompt selection window should be modal and blocking
- After a prompt is selected/entered, the chat window should be shown with the selected prompt
- Prompt message must be sent to ollama as before

## Acceptance Criteria

1. The global shortcut behavior is modified to show a prompt selection window
2. The prompt selection window contains a text area and buttons for preconfigured prompts
3. Settings can be configured to include preconfigured prompts with title, icon, and prompt text
4. Window size dynamically adjusts based on number of preconfigured prompts
5. After selecting or entering a prompt, the chat window opens with that prompt

## Implementation Plan

1. Extend the ISettings interface to include preconfigured prompts
2. Remove prompt field from ollama settings
3. Create a new prompt selection window in the main process
4. Modify the global shortcut handler to show the prompt selection window
5. Create a new renderer component for the prompt selection window
6. Implement logic to handle prompt selection and pass it to the chat window and ollama
7. Update settings UI to allow configuration of preconfigured prompts
