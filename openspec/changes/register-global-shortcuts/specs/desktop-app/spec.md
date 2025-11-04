## ADDED Requirements

### 1. Global Shortcut Registration

#### Scenario: User registers a global shortcut
- [ ] Given the application is running
- [ ] When the user navigates to the settings menu
- [ ] And selects the global shortcuts option
- [ ] And enters a keyboard shortcut (e.g., Ctrl+Shift+X)
- [ ] Then the shortcut should be registered globally
- [ ] And the application should be able to detect when this shortcut is pressed

#### Scenario: Global shortcut triggers
- [ ] Given a global shortcut has been registered
- [ ] When the user presses the registered shortcut combination
- [ ] Then the application should capture the currently selected text from the active application
- [ ] And display the captured text in an alert dialog

#### Scenario: Text retrieval from any application
- [ ] Given a global shortcut has been registered and triggered
- [ ] When the application captures selected text
- [ ] Then it should retrieve text from any application (browser, word processor, etc.)
- [ ] And display it in an alert dialog

#### Scenario: Settings persistence
- [ ] Given the application has been configured with a global shortcut
- [ ] When the application is restarted
- [ ] Then the registered shortcut should persist and remain active

### 2. Settings Management

#### Scenario: Settings are persisted
- [ ] Given the application has a settings system
- [ ] When a user configures global shortcuts
- [ ] Then the settings should be persisted to app-data/settings.json
- [ ] And the settings should be loaded on application startup
