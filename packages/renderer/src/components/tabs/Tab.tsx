import React from 'react';

import type { ITabInfo } from '../../domains/multi-chat';
import { getNativeStyles } from '../../styles/NativeStyles';
import { renderMarkdown } from '../../utils/markdownRenderer';

import { CloseIcon } from '../icons';
import { Tooltip } from '../Tooltip';

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
        gap-2 max-w-xs
      `}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <Tooltip content={displayTitle}>
          <button
            type="button"
            onClick={onSelect}
            className="flex-1 flex items-center gap-2 min-w-0 text-left transition-all duration-300 hover:opacity-80 active:scale-95 h-full overflow-hidden w-full max-w-full"
            aria-label={`Switch to tab: ${displayTitle}`}
          >
            <div
              className="truncate markdown-content tab-title min-w-0 overflow-hidden w-full"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
            />
          </button>
        </Tooltip>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        className={`${nativeStyles.tabs.tab.closeButton} cursor-pointer pointer-events-auto z-10 flex-shrink-0 p-0.5 rounded hover:bg-gray-700/50 transition-all duration-200`}
        aria-label="Close tab"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
};
