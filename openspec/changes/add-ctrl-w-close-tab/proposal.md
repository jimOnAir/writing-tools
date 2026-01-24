# Change: Add Ctrl+W Close Tab Functionality

## Why
This change implements keyboard shortcut support for closing chat tabs using Ctrl+W (Cmd+W on macOS). Currently, there's no way to close individual chat tabs quickly without clicking the tab's close button or using the sidebar. This feature improves user efficiency by providing a standard keyboard shortcut for this common action.

## What Changes
- Add document-level keydown listener in MultiChatService
- Implement Ctrl+W/Cmd+W handler that closes the currently active chat tab
- Properly clean up event listeners when service is destroyed

## Impact
- Affected specs: multi-chat
- Affected code: packages/renderer/src/domains/multi-chat/MultiChatService.ts
