# Prompt Selector Window - Design

## Overview

This document outlines the design for implementing a prompt selection window that will replace the current direct execution of a single preconfigured prompt when the global shortcut is pressed.

## Architecture

### Component Structure

```
Main Process:
- PromptSelectorWindow (new)
  - Creates and manages the prompt selection window
  - Handles communication with renderer process
  - Passes selected prompt to chat window

Renderer Process:
- PromptSelectorComponent (new)
  - UI for prompt selection
  - Text area for custom prompts
  - Buttons for preconfigured prompts
  - Logic for handling user selections

Settings:
- Extended ISettings interface to include preconfigured prompts
```

### Data Flow

1. User presses global shortcut
2. Main process shows prompt selection window
3. User selects a preconfigured prompt or enters a custom prompt
4. Selected prompt is sent to the chat window
5. Chat window displays the prompt and processes it

## Implementation Details

### Settings Extension

The ISettings interface will be extended to include a new field for preconfigured prompts. The existing prompt field in ollama settings will be removed:

```typescript
interface ISettings {
  ollama: {
    address: string,
    model: string | undefined,
  };
  globalShortcut: string | undefined;
  // New field for preconfigured prompts
  preconfiguredPrompts: Array<{
    title: string;
    icon?: string;
    prompt: string;
  }>;
}
```

### Main Process Changes

1. Create a new function `getPromptSelectorWindow()` in `windows.ts`
2. Modify `processGlobalShortcut()` in `shortcuts.ts` to show the prompt selector window instead of directly executing
3. Add IPC communication to pass the selected prompt to the chat window

### Renderer Process Changes

1. Create a new component `PromptSelectorComponent.tsx`
2. Create a new route/view for the prompt selector window
3. Implement UI for:
   - Text area for custom prompts
   - Buttons for preconfigured prompts
   - Dynamic window sizing based on number of buttons

### Window Sizing Logic

The window size will be computed based on the number of preconfigured prompts:
- Minimum height: 300px
- Additional height: 50px per preconfigured prompt
- Width: 500px (fixed)
- For custom prompts, add extra space for the text area

## IPC Communication

### New IPC Channels

We'll need to add a new IPC channel for prompt selection:

```typescript
// In shared interfaces
export enum EIpcChannel {
  // ... existing channels
  PROMPT_SELECTOR = 'PROMPT_SELECTOR',
}

export enum EIpcEvent {
  // ... existing events
  PROMPT_SELECT = 'PROMPT_SELECT',
}
```

### Message Flow

1. Main process shows prompt selector window
2. User makes selection in renderer
3. Renderer sends selected prompt via IPC to main process
4. Main process passes prompt to chat window
