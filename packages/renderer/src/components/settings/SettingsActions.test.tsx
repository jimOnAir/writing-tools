import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { SettingsActions } from './SettingsActions';

describe('SettingsActions', () => {
  let onSave: jest.Mock;
  let onCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    onSave = jest.fn().mockResolvedValue(undefined);
    onCancel = jest.fn();
  });

  it('renders save and cancel buttons', () => {
    render(
      <SettingsActions
        hasUnsavedChanges={false}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables buttons when no unsaved changes', () => {
    render(
      <SettingsActions
        hasUnsavedChanges={false}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const saveButton = screen.getByText('Save');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('enables buttons when there are unsaved changes', () => {
    render(
      <SettingsActions
        hasUnsavedChanges
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const saveButton = screen.getByText('Save');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).not.toBeDisabled();
    expect(cancelButton).not.toBeDisabled();
  });

  it('calls onSave when save button is clicked', async () => {
    render(
      <SettingsActions
        hasUnsavedChanges
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <SettingsActions
        hasUnsavedChanges
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('handles promise from onSave', async () => {
    const savePromise = Promise.resolve();
    onSave.mockReturnValue(savePromise);

    render(
      <SettingsActions
        hasUnsavedChanges
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });
});
