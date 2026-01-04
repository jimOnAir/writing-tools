import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { SettingsService } from '../domains/settings';

import { SettingsModal } from './SettingsModal';

// Mock getNativeStyles and getPlatform
jest.mock('../styles/NativeStyles', () => ({
  getNativeStyles: jest.fn(() => ({
    modal: {
      backdrop: 'modal-backdrop',
      container: 'modal-container',
    },
  })),
}));

jest.mock('../utils/platformDetection', () => ({
  getPlatform: jest.fn().mockResolvedValue('linux'),
}));

// Mock Settings component
jest.mock('./Settings', () => ({
  __esModule: true,
  default: jest.fn(() => <div>Settings Component</div>),
}));

describe('SettingsModal', () => {
  let mockSettingsService: jest.Mocked<SettingsService>;
  let onClose: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettingsService = {
      setCallbacks: jest.fn(),
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;

    onClose = jest.fn();
  });

  it('does not render when isOpen is false', () => {
    render(
      <SettingsModal
        isOpen={false}
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Settings Component')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    const backdrop = screen.getByLabelText('Close settings modal');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when modal content is clicked', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    const modalContent = screen.getByText('Settings Component');
    fireEvent.click(modalContent);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when ESC key is pressed', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', () => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <SettingsModal
        isOpen
        onClose={onClose}
        settingsService={mockSettingsService}
      />,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
