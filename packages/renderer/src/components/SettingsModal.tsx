import React, { useEffect, useState } from 'react';

import type { SettingsService } from '../domains/settings';
import { getNativeStyles } from '../styles/NativeStyles';
import { ColorPalette } from '../styles/Styles';
import { getPlatform } from '../utils/platformDetection';

import Settings from './Settings';
import { SettingsActions } from './settings/SettingsActions';

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly settingsService: SettingsService;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settingsService }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSave = async () => {
    const saveSuccess = await settingsService.saveSettings();
    if (saveSuccess) {
      alert('Settings saved successfully!');
    }
  };

  const handleCancel = () => {
    settingsService.cancelChanges();
  };

  const handleSettingsChange = () => {
    setRefreshKey(k => k + 1);
  };

  if (!isOpen) {
    return null;
  }

  const nativeStyles = getNativeStyles(platform);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${nativeStyles.modal.backdrop}
        transition-opacity duration-200
      `}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Close settings modal"
    >
      <div
        className={`
          ${nativeStyles.modal.container}
          flex flex-col max-w-4xl w-full max-h-[90vh]
          m-4 p-6
          transition-all duration-200
        `}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between mb-4">
          <h2 id="settings-modal-title" className="text-xl font-semibold text-white">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-2 pb-4">
          <Settings onChange={handleSettingsChange} settingsService={settingsService} isModal />
        </div>
        <div className={`flex shrink-0 pt-4 mt-4 border-t ${ColorPalette.border.defaultLight}`}>
          <SettingsActions
            hasUnsavedChanges={settingsService.hasUnsavedChanges()}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
};
