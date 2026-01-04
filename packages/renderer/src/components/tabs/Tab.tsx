import React from 'react';

import type { ITabInfo } from '../../domains/multi-chat';
import { getNativeStyles } from '../../styles/NativeStyles';
import { renderMarkdown } from '../../utils/markdownRenderer';

export interface TabProps {
  readonly tab: ITabInfo;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onClose: () => void;
  readonly platform: 'darwin' | 'win32' | 'linux';
}

export const Tab: React.FC<TabProps> = ({ tab, isActive, onSelect, onClose, platform }) => {
  const nativeStyles = getNativeStyles(platform);
  const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Tab';

  return (
    <div
      className={`
        ${nativeStyles.tabs.tab.base}
        ${isActive ? nativeStyles.tabs.tab.active : nativeStyles.tabs.tab.inactive}
        flex items-center gap-2 max-w-xs
      `}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 min-w-0 text-left"
        aria-label={`Switch to tab: ${displayTitle}`}
      >
        <span
          className="truncate markdown-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
        />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        className={`${nativeStyles.tabs.tab.closeButton} cursor-pointer pointer-events-auto z-10 flex-shrink-0`}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
};
