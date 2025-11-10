# Arrow Key Message Recall

## Added Requirements

### Scenario: Up Arrow Key Recalls Previous Messages
- **Given** the user has typed and sent at least one message in the chat
- **When** the user focuses on the input field and presses the up arrow key
- **Then** the most recent message should be loaded into the input field
- **And** subsequent up arrow key presses should cycle through previous messages

### Scenario: Down Arrow Key Returns to Current Input
- **Given** the user has recalled a previous message using up arrow key
- **When** the user presses the down arrow key
- **Then** the input should cycle back through history or reset to empty if at the beginning

### Scenario: Empty Messages Are Not Stored in History
- **Given** the user has sent an empty message
- **When** the user presses Enter on an empty message
- **Then** the empty message should not be added to the message history

### Scenario: History Is Limited to 10 Messages
- **Given** the user has sent more than 10 messages
- **When** the user recalls messages using up arrow key
- **Then** only the most recent 10 messages should be available in history

### Scenario: No History Available
- **Given** the user has not sent any messages yet
- **When** the user presses the up arrow key
- **Then** nothing should happen (no error or unexpected behavior)
