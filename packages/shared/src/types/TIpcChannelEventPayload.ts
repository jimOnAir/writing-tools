/* eslint-disable @stylistic/indent */
/* eslint-disable @stylistic/operator-linebreak */
import type { EIpcChannel } from '../enum/EIpcChannel';
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatInfo } from '../interfaces/IChatInfo';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

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

export type TIpcEventPayload<K extends EIpcEvent> =
  K extends EIpcEvent.CHAT_CREATE_SESSION ? TChatCreateSessionPayload :
  K extends EIpcEvent.CHAT_DELETE ? TChatDeletePayload :
  K extends EIpcEvent.CHAT_GET ? TChatGetPayload :
  K extends EIpcEvent.CHAT_LIST_CHATS ? TChatListChatsPayload :
  K extends EIpcEvent.CHAT_LOAD_MESSAGES ? TChatLoadMessagesPayload :
  K extends EIpcEvent.CHAT_OPEN ? TChatOpenPayload :
  K extends EIpcEvent.CHAT_SEND_MESSAGE ? TChatSendMessagePayload :
  K extends EIpcEvent.ENV_GET ? TEnvGetPayload :
  K extends EIpcEvent.MODEL_LIST ? TModelListPayload :
  K extends EIpcEvent.PROMPT_SELECT ? TPromptSelectPayload :
  K extends EIpcEvent.SETTINGS_LOAD ? TSettingsLoadPayload :
  K extends EIpcEvent.SETTINGS_SAVE ? TSettingsSavePayload :
never;

export type TIpcEvent <T extends EIpcChannel, K extends EIpcEvent> = {
  channel: T,
  event: K,
  payload: TIpcEventPayload<K>,
};
