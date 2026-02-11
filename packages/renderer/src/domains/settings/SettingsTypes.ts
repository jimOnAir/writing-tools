import type { ISettings } from '@writing-tools/shared';

// Domain-specific types for settings
// Most types are imported from @writing-tools/shared
// This file is reserved for any settings-domain-specific type extensions

export type TAvailableModelsByProvider = {
  lmstudio: string[],
  ollama: string[],
};

export type SettingsServiceCallbacks = {
  onAvailableModelsChange?: (payload: TAvailableModelsByProvider) => void,
  onErrorChange?: (error: string | null) => void,
  onLoadingModelsChange?: (loading: boolean) => void,
  onOriginalSettingsChange?: (settings: ISettings) => void,
  onSettingsChange?: (settings: ISettings) => void,
  onSuccessChange?: (success: string | null) => void,
};
