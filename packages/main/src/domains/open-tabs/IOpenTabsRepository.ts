export interface TOpenTab {
  readonly chatId: number | null;
  readonly isActive: boolean;
  readonly scrollPosition?: number;
  readonly tabOrder: number;
}

/**
 * Interface for open tabs repository operations
 * Handles persistence of open chat tabs across app restarts
 */
export interface IOpenTabsRepository {
  /**
   * Save array of open tabs with chatIds and order
   * Replaces all existing tabs with the new ones
   */
  saveOpenTabs: (tabs: TOpenTab[]) => void;

  /**
   * Load saved tabs (open tabs with tabOrder >= 0) and scroll positions for closed chats (tabOrder === -1)
   */
  loadOpenTabs: () => { openTabs: TOpenTab[], scrollPositionsByChatId: Record<number, number> };

  /**
   * Clear all saved tabs
   */
  clearOpenTabs: () => void;

  /**
   * Delete all open_tabs entries referencing a specific chatId
   * Called when a chat is deleted to clean up orphaned references
   */
  deleteTabsByChatId: (chatId: number) => void;
}
