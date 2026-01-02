import type { ISettings } from '@writing-tools/shared';

// Domain-specific types for settings
// Most types are imported from @writing-tools/shared
// This file is reserved for any settings-domain-specific type extensions

export type SettingsServiceCallbacks = {
  onSettingsChange?: (settings: ISettings) => void,
  onOriginalSettingsChange?: (settings: ISettings) => void,
  onAvailableModelsChange?: (models: string[]) => void,
  onLoadingModelsChange?: (loading: boolean) => void,
  onErrorChange?: (error: string | null) => void,
  onSuccessChange?: (success: string | null) => void,
};
