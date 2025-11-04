1. Add global shortcuts settings UI
   - Create a new section in the settings menu for global shortcuts
   - Add input field for defining shortcut combinations
   - Add validation for shortcut inputs
   - Add save button to persist settings

2. Implement global shortcut registration
   - Use Electron's globalShortcut module to register shortcuts
   - Handle shortcut registration and unregistration
   - Implement logic to detect when shortcuts are pressed

3. Implement text retrieval functionality
   - Add capability to capture selected text from active application
   - Handle cross-platform differences in text retrieval
   - Implement clipboard-based text capture

4. Persist shortcut settings
   - Store registered shortcuts in settings.json
   - Load shortcuts on application startup
   - Handle settings migration if needed

5. Add error handling and validation
   - Validate shortcut combinations before registration
   - Handle cases where shortcuts are already in use
   - Provide user feedback for invalid inputs

6. Update main process to handle global shortcuts
   - Modify main.ts to initialize global shortcut handling
   - Add event listeners for shortcut presses
   - Implement alert display functionality

7. Testing and validation
   - Test shortcut registration and detection
   - Test text retrieval from different applications
   - Verify settings persistence across restarts
   - Test edge cases and error conditions
