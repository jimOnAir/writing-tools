export interface TOpenTab {
  readonly chatId: number | null;
  readonly tabOrder: number;
  readonly isActive: boolean;
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
   * Load saved tabs (returns array sorted by tab_order)
   */
  loadOpenTabs: () => TOpenTab[];

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
