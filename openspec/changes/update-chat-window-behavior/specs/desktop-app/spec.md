## ADDED Requirements

### 1. Chat Window Opening Behavior

#### Scenario: Chat window opens when shortcut is triggered
- Given the user has configured a shortcut for the chat window
- When the user triggers the shortcut
- Then the chat window should open (or appear if already open)
- And the current request should be displayed

#### Scenario: Chat window displays current request
- Given the chat window is opened via shortcut
- When the window appears
- Then it should display the current request or selected text

### 2. Chat Window Updating Behavior

#### Scenario: Chat window clears previous conversation when new selection is processed
- Given the chat window is already open
- When a new selection is processed
- Then the previous conversation should be cleared
- And a new chat session should start with the latest selected text and prompt

### 3. Single Instance Policy

#### Scenario: Only one chat window can be active at a time
- Given multiple shortcut triggers or concurrent access attempts
- When the user attempts to open multiple windows
- Then only one chat window should be active
- And repeated shortcut presses should refresh the content instead of creating new windows

### 4. Chat Window Reusability

#### Scenario: Same window is reused for all subsequent prompts
- Given the chat window has been opened
- When subsequent prompts are triggered
- Then the same window instance should be reused
- And the window should maintain consistent position and size

### 5. Chat Window Closing Behavior

#### Scenario: Chat window can be closed manually
- Given the chat window is open
- When the user closes the window manually
- Then the window should close and be removed from the screen
- And the application should be able to reopen it on next shortcut
