import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatInfo } from '../interfaces/IChatInfo';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

import type { TEnsureAllKeysMap } from './TEnsureAllKeysMap';

export type TEnvGetResponse = { arch: string, os: string, platform: NodeJS.Platform };

export type TModelListSuccessResponse = { models: string[] };

export type TModelListFailedResponse = { error: string };

export type TModelListResponse = TModelListSuccessResponse | TModelListFailedResponse;

export type TSettingsLoadResponse = ISettings;

export type TSettingsSaveSuccessResponse = { success: true };

export type TSettingsSaveFailedResponse = { error: string, success: false };

export type TSettingsSaveResponse = TSettingsSaveSuccessResponse | TSettingsSaveFailedResponse;

export type TChatSendMessageSuccessResponse = { response: string };

export type TChatSendMessageFailedResponse = { error: string };

export type TChatSendMessageResponse = TChatSendMessageSuccessResponse | TChatSendMessageFailedResponse;

export type TChatCreateSessionSuccessResponse = { chatId: number };

export type TChatCreateSessionFailedResponse = { error: string };

export type TChatCreateSessionResponse = TChatCreateSessionSuccessResponse | TChatCreateSessionFailedResponse;

export type TChatLoadMessagesSuccessResponse = { messages: IChatMessage[] };

export type TChatLoadMessagesFailedResponse = { error: string };

export type TChatLoadMessagesResponse = TChatLoadMessagesSuccessResponse | TChatLoadMessagesFailedResponse;

export type TChatListChatsSuccessResponse = { chats: IChatInfo[] };

export type TChatListChatsFailedResponse = { error: string };

export type TChatListChatsResponse = TChatListChatsSuccessResponse | TChatListChatsFailedResponse;

export type TChatGetSuccessResponse = { chat: IChatInfo };

export type TChatGetFailedResponse = { error: string };

export type TChatGetResponse = TChatGetSuccessResponse | TChatGetFailedResponse;

export type TChatDeleteSuccessResponse = { success: true };

export type TChatDeleteFailedResponse = { error: string, success: false };

export type TChatDeleteResponse = TChatDeleteSuccessResponse | TChatDeleteFailedResponse;

export type TChatOpenSuccessResponse = { success: true };

export type TChatOpenFailedResponse = { error: string, success: false };

export type TChatOpenResponse = TChatOpenSuccessResponse | TChatOpenFailedResponse;

export type TPromptSelectResponse = Record<string, never>;

export type TIpcResponsePayloadMap = {
  [EIpcEvent.CHAT_CREATE_SESSION]: TChatCreateSessionResponse,
  [EIpcEvent.CHAT_DELETE]: TChatDeleteResponse,
  [EIpcEvent.CHAT_GET]: TChatGetResponse,
  [EIpcEvent.CHAT_LIST_CHATS]: TChatListChatsResponse,
  [EIpcEvent.CHAT_LOAD_MESSAGES]: TChatLoadMessagesResponse,
  [EIpcEvent.CHAT_OPEN]: TChatOpenResponse,
  [EIpcEvent.CHAT_SEND_MESSAGE]: TChatSendMessageResponse,
  [EIpcEvent.ENV_GET]: TEnvGetResponse,
  [EIpcEvent.MODEL_LIST]: TModelListResponse,
  [EIpcEvent.PROMPT_SELECT]: TPromptSelectResponse,
  [EIpcEvent.SETTINGS_LOAD]: TSettingsLoadResponse,
  [EIpcEvent.SETTINGS_SAVE]: TSettingsSaveResponse,
};

type TCheckedMap = TEnsureAllKeysMap<EIpcEvent, TIpcResponsePayloadMap>;

export type TIpcResponsePayload<K extends EIpcEvent> = TCheckedMap[K];
