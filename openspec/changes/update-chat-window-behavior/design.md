## Context
The writing assistance application needs improved chat window behavior to provide a consistent and predictable user experience. Currently, the chat window behavior is not well-defined, leading to inconsistent interactions when users trigger the shortcut multiple times or when selections change.

## Goals / Non-Goals
- Goals:
  * Establish clear behavior for chat window opening when shortcut is triggered
  * Implement single instance policy to prevent multiple chat windows
  * Ensure chat window reuses same instance for all subsequent prompts
  * Maintain consistent window position and size across sessions

- Non-Goals:
  * Implement advanced chat features (these will be added in later changes)
  * Change the core chat functionality or prompt processing
  * Modify the underlying data models or storage

## Decisions
- Decision: Use a singleton pattern for chat window management to enforce single instance
- Decision: Store chat window reference globally to maintain consistent access
- Decision: Implement window positioning and sizing logic that preserves user preferences
- Decision: Update ChatComponent to integrate with new window management system

## Risks / Trade-offs
- Risk: Window management complexity may introduce bugs in window lifecycle
  - Mitigation: Implement comprehensive testing for window open/close scenarios
- Risk: Reusing same window instance may cause state issues
  - Mitigation: Clear conversation state when starting new chat sessions

## Migration Plan
- This change will update the window management system to support the new chat window behavior
- Existing chat functionality will be preserved but integrated with new window management
- Future changes can build upon this foundation for additional chat features
