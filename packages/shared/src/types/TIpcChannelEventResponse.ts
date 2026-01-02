/* eslint-disable @stylistic/indent */
/* eslint-disable @stylistic/operator-linebreak */
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatInfo } from '../interfaces/IChatInfo';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

export type TEnvGetResponse = { platform: NodeJS.Platform, os: string, arch: string };

export type TModelListSuccessResponse = { models: string[] };

export type TModelListFailedResponse = { error: string };

export type TModelListResponse = TModelListSuccessResponse | TModelListFailedResponse;

export type TSettingsLoadResponse = ISettings;

export type TSettingsSaveSuccessResponse = { success: true };

export type TSettingsSaveFailedResponse = { success: false, error: string };

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

export type TIpcResponsePayload<K extends EIpcEvent> =
  K extends EIpcEvent.ENV_GET ? TEnvGetResponse :
  K extends EIpcEvent.MODEL_LIST ? TModelListResponse :
  K extends EIpcEvent.SETTINGS_LOAD ? TSettingsLoadResponse :
  K extends EIpcEvent.SETTINGS_SAVE ? TSettingsSaveResponse :
  K extends EIpcEvent.CHAT_SEND_MESSAGE ? TChatSendMessageResponse :
  K extends EIpcEvent.CHAT_CREATE_SESSION ? TChatCreateSessionResponse :
  K extends EIpcEvent.CHAT_LOAD_MESSAGES ? TChatLoadMessagesResponse :
  K extends EIpcEvent.CHAT_LIST_CHATS ? TChatListChatsResponse :
never;
