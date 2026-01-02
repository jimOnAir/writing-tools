import React from 'react';

import { ButtonStyles, LayoutStyles } from '../../styles/Styles';

interface SettingsActionsProps {
  readonly hasUnsavedChanges: boolean;
  readonly onSave: () => Promise<void>;
  readonly onCancel: () => void;
}

export const SettingsActions: React.FC<SettingsActionsProps> = ({
  hasUnsavedChanges,
  onSave,
  onCancel,
}) => {
  return (
    <div className={`flex space-x-3 pt-4 ${LayoutStyles.divider}`}>
      <button
        onClick={() => {
          void onSave();
        }}
        disabled={!hasUnsavedChanges}
        className={`${ButtonStyles.base} ${hasUnsavedChanges ? ButtonStyles.success : ButtonStyles.disabled}`}
      >
        Save Changes
      </button>
      <button
        onClick={onCancel}
        disabled={!hasUnsavedChanges}
        className={`${ButtonStyles.base} ${hasUnsavedChanges ? ButtonStyles.cancel : ButtonStyles.disabled}`}
      >
        Cancel
      </button>
    </div>
  );
};
