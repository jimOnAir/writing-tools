import React from 'react';

import { ButtonStyles, ButtonSizeStyles, InputStyles, BackgroundStyles, TypographyStyles, LayoutStyles, ColorPalette } from '../../styles/Styles';
import { CloseIcon } from '../icons';

export interface GlobalShortcutsSectionProps {
  readonly currentShortcut: string | undefined;
  readonly newShortcut: string;
  readonly onNewShortcutChange: (value: string) => void;
  readonly onSetShortcut: () => void;
  readonly onRemoveShortcut: () => void;
}

export const GlobalShortcutsSection: React.FC<GlobalShortcutsSectionProps> = ({
  currentShortcut,
  newShortcut,
  onNewShortcutChange,
  onSetShortcut,
  onRemoveShortcut,
}) => {
  return (
    <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
      <h3 className={TypographyStyles.h2}>Global Shortcuts</h3>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newShortcut}
          onChange={(e) => {
            onNewShortcutChange(e.target.value);
          }}
          placeholder="e.g., Ctrl+Shift+X"
          className={InputStyles}
        />
        <button
          onClick={onSetShortcut}
          className={`${ButtonStyles.base} ${ButtonSizeStyles.default} ${ButtonStyles.primary} whitespace-nowrap`}
        >
          Set Shortcut
        </button>
      </div>
      {currentShortcut ? (
        <div className="flex items-center gap-3 mt-3">
          <span
            className={`
              px-2 py-1 rounded font-mono text-sm
              ${ColorPalette.background.main}/50
              ${ColorPalette.text.tertiary}
            `}
          >
            {currentShortcut}
          </span>
          <button
            onClick={onRemoveShortcut}
            className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-red-400 transition-all duration-200 flex items-center justify-center"
            aria-label="Remove shortcut"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ) : null}
      <p className={`mt-3 text-sm ${ColorPalette.text.muted}`}>
        Enter a keyboard shortcut (e.g., Ctrl+Shift+X). Global shortcuts work even when the application is not focused.
      </p>
    </div>
  );
};
