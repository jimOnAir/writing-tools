import type { EIpcChannel } from '../enum/EIpcChannel';
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

import type { TEnsureAllKeysMap } from './TEnsureAllKeysMap';

export type TSettingsSavePayload = ISettings;

export type TSettingsLoadPayload = Record<string, never>;

export type TModelListPayload = { provider: 'ollama' | 'lmstudio' };

export type TChatSendMessagePayload = { chatId: number, messages: IChatMessage[] };

export type TChatCreateSessionPayload = Record<string, never>;

export type TChatLoadMessagesPayload = { chatId: number };

export type TChatListChatsPayload = Record<string, never>;

export type TChatGetPayload = { chatId: number };

export type TChatDeletePayload = { chatId: number };

export type TChatOpenPayload = { chatId: number };

export type TEnvGetPayload = Record<string, never>;

export type TPromptSelectPayload = { prompt: string };

export type TIpcEventPayloadMap = {
  [EIpcEvent.CHAT_CREATE_SESSION]: TChatCreateSessionPayload,
  [EIpcEvent.CHAT_DELETE]: TChatDeletePayload,
  [EIpcEvent.CHAT_GET]: TChatGetPayload,
  [EIpcEvent.CHAT_LIST_CHATS]: TChatListChatsPayload,
  [EIpcEvent.CHAT_LOAD_MESSAGES]: TChatLoadMessagesPayload,
  [EIpcEvent.CHAT_OPEN]: TChatOpenPayload,
  [EIpcEvent.CHAT_SEND_MESSAGE]: TChatSendMessagePayload,
  [EIpcEvent.ENV_GET]: TEnvGetPayload,
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
