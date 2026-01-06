import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { GlobalShortcutsSection } from './GlobalShortcutsSection';
import type { GlobalShortcutsSectionProps } from './GlobalShortcutsSection';

describe('GlobalShortcutsSection', () => {
  const defaultProps: GlobalShortcutsSectionProps = {
    currentShortcut: undefined,
    newShortcut: '',
    onNewShortcutChange: jest.fn(),
    onSetShortcut: jest.fn(),
    onRemoveShortcut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shortcut input and set button', () => {
    render(<GlobalShortcutsSection {...defaultProps} />);

    expect(screen.getByPlaceholderText('e.g., Ctrl+Shift+X')).toBeInTheDocument();
    expect(screen.getByText('Set Shortcut')).toBeInTheDocument();
  });

  it('calls onNewShortcutChange when input changes', () => {
    render(<GlobalShortcutsSection {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g., Ctrl+Shift+X');
    fireEvent.change(input, { target: { value: 'Command+Shift+I' } });

    expect(defaultProps.onNewShortcutChange).toHaveBeenCalledWith('Command+Shift+I');
  });

  it('calls onSetShortcut when set button is clicked', () => {
    render(<GlobalShortcutsSection {...defaultProps} newShortcut="Command+Shift+I" />);

    const setButton = screen.getByText('Set Shortcut');
    fireEvent.click(setButton);

    expect(defaultProps.onSetShortcut).toHaveBeenCalled();
  });

  it('displays current shortcut when set', () => {
    render(<GlobalShortcutsSection {...defaultProps} currentShortcut="Command+Shift+I" />);

    expect(screen.getByText('Command+Shift+I')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove shortcut')).toBeInTheDocument();
  });

  it('calls onRemoveShortcut when remove button is clicked', () => {
    render(<GlobalShortcutsSection {...defaultProps} currentShortcut="Command+Shift+I" />);

    const removeButton = screen.getByLabelText('Remove shortcut');
    fireEvent.click(removeButton);

    expect(defaultProps.onRemoveShortcut).toHaveBeenCalled();
  });

  it('does not display current shortcut section when no shortcut is set', () => {
    render(<GlobalShortcutsSection {...defaultProps} />);

    expect(screen.queryByLabelText('Remove shortcut')).not.toBeInTheDocument();
  });
});
