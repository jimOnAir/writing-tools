import React, { useEffect, useState } from 'react';

import type { SettingsService } from '../domains/settings';
import { getNativeStyles } from '../styles/NativeStyles';
import { getPlatform } from '../utils/platformDetection';

import Settings from './Settings';

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly settingsService: SettingsService;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settingsService }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

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
          <Settings settingsService={settingsService} isModal />
        </div>
      </div>
    </div>
  );
};
