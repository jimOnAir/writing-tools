# Prompt Selector Window - Tasks

## Task List

### 1. Update Settings Interface
- [ ] Update ISettings interface to remove prompt field from ollama settings
- [ ] Add preconfiguredPrompts field to ISettings
- [ ] Update DefaultSettings to include default preconfigured prompts

### 2. Create Prompt Selector Window in Main Process
- [ ] Add new function `getPromptSelectorWindow()` in `packages/main/src/windows.ts`
- [ ] Implement window creation logic with proper sizing
- [ ] Add IPC handlers for prompt selection

### 3. Modify Global Shortcut Handler
- [ ] Split `processGlobalShortcut()` into two functions: `openPromptSelector()` and `sendPromptToOllama()`
- [ ] Update `openPromptSelector()` to show prompt selector window
- [ ] Implement logic to pass selected prompt to chat window
- [ ] Implement `sendPromptToOllama()` to send prompt to ollama as before

### 4. Create Prompt Selector Component
- [ ] Create `PromptSelectorComponent.tsx` in `packages/renderer/src/components/`
- [ ] Implement UI with text area and buttons for preconfigured prompts
- [ ] Add dynamic window sizing logic
- [ ] Implement IPC communication for prompt selection

### 5. Update Settings UI
- [ ] Extend Settings component to include preconfigured prompts configuration
- [ ] Add UI for adding/removing preconfigured prompts
- [ ] Add validation for prompt configurations

### 6. Implement IPC Communication
- [ ] Add new IPC channel and events for prompt selection
- [ ] Register IPC handlers for prompt selection
- [ ] Handle communication between prompt selector and chat window

### 7. Testing
- [ ] Add unit tests for new components
- [ ] Add integration tests for the flow
- [ ] Manual testing of the complete workflow

### 8. Documentation
- [ ] Update README if needed
