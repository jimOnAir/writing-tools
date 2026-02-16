import type { EIpcChannel } from '../enum/EIpcChannel';
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

import type { TEnsureAllKeysMap } from './TEnsureAllKeysMap';
import type { TOpenTab } from './TOpenTab';

export type TSettingsSavePayload = ISettings;

export type TSettingsLoadPayload = Record<string, never>;

export type TModelContextLengthPayload = { model: string, provider: 'ollama' | 'lmstudio' };

export type TModelListPayload = { provider: 'ollama' | 'lmstudio' };

export type TChatCreateSessionPayload = Record<string, never>;

export type TChatLoadMessagesPayload = { chatId: number };

export type TChatListChatsPayload = {
  limit?: number,
  offset?: number,
};

export type TChatGetPayload = { chatId: number };

export type TChatDeletePayload = { chatId: number };

export type TChatLoadTabsPayload = Record<string, never>;

export type TChatOpenPayload = { chatId: number };

export type TChatRegenerateTitlePayload = { chatId: number };

export type TChatSaveTabsPayload = { tabs: TOpenTab[] };

export type TChatUpdateTitlePayload = { chatId: number, title: string };

export type TEnvGetPayload = Record<string, never>;

export type TPromptSelectPayload = {
  model?: string,
  prompt: string,
  provider?: 'ollama' | 'lmstudio',
};

export type TChatSendMessageStreamPayload = {
  chatId: number,
  messages: IChatMessage[],
  model?: string,
  provider?: 'ollama' | 'lmstudio',
};

export type TMESSAGE_STOP_STREAMPayload = { chatId: number };

export type TIpcEventPayloadMap = {
  [EIpcEvent.CHAT_CREATE]: TChatCreateSessionPayload,
  [EIpcEvent.CHAT_DELETE]: TChatDeletePayload,
  [EIpcEvent.CHAT_GET]: TChatGetPayload,
  [EIpcEvent.CHAT_LIST]: TChatListChatsPayload,
  [EIpcEvent.MESSAGES_LOAD]: TChatLoadMessagesPayload,
  [EIpcEvent.TABS_LOAD]: TChatLoadTabsPayload,
  [EIpcEvent.CHAT_OPEN]: TChatOpenPayload,
  [EIpcEvent.CHAT_REGENERATE_TITLE]: TChatRegenerateTitlePayload,
  [EIpcEvent.CHAT_UPDATE_TITLE]: TChatUpdateTitlePayload,
  [EIpcEvent.TABS_SAVE]: TChatSaveTabsPayload,
  [EIpcEvent.MESSAGE_SEND_STREAM]: TChatSendMessageStreamPayload,
  [EIpcEvent.MESSAGE_STOP_STREAM]: TMESSAGE_STOP_STREAMPayload,
  [EIpcEvent.ENV_GET]: TEnvGetPayload,
  [EIpcEvent.MODEL_CONTEXT_LENGTH]: TModelContextLengthPayload,
  [EIpcEvent.MODEL_LIST]: TModelListPayload,
  [EIpcEvent.PROMPT_SELECT]: TPromptSelectPayload,
  [EIpcEvent.SETTINGS_LOAD]: TSettingsLoadPayload,
  [EIpcEvent.SETTINGS_SAVE]: TSettingsSavePayload,
};

type TCheckedMap = TEnsureAllKeysMap<EIpcEvent, TIpcEventPayloadMap>;

export type TIpcEventPayload<K extends EIpcEvent> = TCheckedMap[K];

export type TIpcEvent <T extends EIpcChannel, K extends EIpcEvent> = {
  channel: T,
  event: K,
  payload: TIpcEventPayload<K>,
};
