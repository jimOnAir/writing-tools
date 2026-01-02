import React from 'react';

import { ButtonStyles, InputStyles, BackgroundStyles, TypographyStyles, LayoutStyles, ColorPalette } from '../../styles/Styles';

interface GlobalShortcutsSectionProps {
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
      <div className="mb-6">
        <h4 className={TypographyStyles.h4}>Configure Shortcut</h4>
        <div className="flex items-center space-x-4">
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
            className={`${ButtonStyles.base} ${ButtonStyles.primary} whitespace-nowrap`}
          >
            Set Shortcut
          </button>
        </div>
        <p className={`mt-3 text-sm ${ColorPalette.text.muted}`}>
          Enter a keyboard shortcut combination (e.g., Ctrl+Shift+X)
        </p>
        <p className={`mt-1 text-xs ${ColorPalette.text.disabled}`}>
          Note: Global shortcuts work even when the application is not focused
        </p>
      </div>

      <div>
        <h4 className={TypographyStyles.h4}>Current Shortcut</h4>
        {currentShortcut ? (
          <div
            className={[
              'flex items-center justify-between p-4',
              `${ColorPalette.background.main}/50`,
              ColorPalette.border.lightMedium,
              'rounded-xl',
            ].join(' ')}
          >
            <div className="flex items-center space-x-4">
              <span className={`font-mono ${ColorPalette.text.tertiary} text-lg`}>{currentShortcut}</span>
            </div>
            <button
              onClick={onRemoveShortcut}
              className={`${ButtonStyles.base} ${ButtonStyles.secondary}`}
            >
              Remove
            </button>
          </div>
        ) : (
          <p className={`${ColorPalette.text.disabled} italic`}>No global shortcut configured.</p>
        )}
      </div>
    </div>
  );
};
