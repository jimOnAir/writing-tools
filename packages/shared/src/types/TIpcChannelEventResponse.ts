import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatInfo } from '../interfaces/IChatInfo';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

import type { TEnsureAllKeysMap } from './TEnsureAllKeysMap';
import type { TOpenTab } from './TOpenTab';

export type TEnvGetResponse = { arch: string, os: string, platform: NodeJS.Platform };

export type TModelListSuccessResponse = { models: string[] };

export type TModelListFailedResponse = { error: string, models: string[] };

export type TModelContextLengthResponse = { contextLength: number | null };

export type TModelListResponse = TModelListSuccessResponse | TModelListFailedResponse;

export type TSettingsLoadResponse = ISettings;

export type TSettingsSaveSuccessResponse = { success: true };

export type TSettingsSaveFailedResponse = { error: string, success: false };

export type TSettingsSaveResponse = TSettingsSaveSuccessResponse | TSettingsSaveFailedResponse;

export type TChatSendMessageSuccessResponse = { response: string };

export type TChatSendMessageFailedResponse = { error: string };

export type TChatCreateSessionSuccessResponse = { chatId: number };

export type TChatCreateSessionFailedResponse = { error: string };

export type TChatCreateSessionResponse = TChatCreateSessionSuccessResponse | TChatCreateSessionFailedResponse;

export type TChatLoadMessagesSuccessResponse = { messages: IChatMessage[] };

export type TChatLoadMessagesFailedResponse = { error: string };

export type TChatLoadMessagesResponse = TChatLoadMessagesSuccessResponse | TChatLoadMessagesFailedResponse;

export type TChatListChatsSuccessResponse = { chats: IChatInfo[], hasMore: boolean };

export type TChatListChatsFailedResponse = { error: string };

export type TChatListChatsResponse = TChatListChatsSuccessResponse | TChatListChatsFailedResponse;

export type TChatGetSuccessResponse = { chat: IChatInfo };

export type TChatGetFailedResponse = { error: string };

export type TChatGetResponse = TChatGetSuccessResponse | TChatGetFailedResponse;

export type TChatDeleteSuccessResponse = { success: true };

export type TChatDeleteFailedResponse = { error: string, success: false };

export type TChatDeleteResponse = TChatDeleteSuccessResponse | TChatDeleteFailedResponse;

export type TChatLoadTabsSuccessResponse = {
  scrollPositionsByChatId?: Record<number, number>,
  tabs: TOpenTab[],
};

export type TChatLoadTabsFailedResponse = { error: string };

export type TChatLoadTabsResponse = TChatLoadTabsSuccessResponse | TChatLoadTabsFailedResponse;

export type TChatOpenSuccessResponse = { success: true };

export type TChatOpenFailedResponse = { error: string, success: false };

export type TChatOpenResponse = TChatOpenSuccessResponse | TChatOpenFailedResponse;

export type TChatRegenerateTitleSuccessResponse = { success: true, title: string };

export type TChatRegenerateTitleFailedResponse = { error: string, success: false };

export type TChatRegenerateTitleResponse = TChatRegenerateTitleSuccessResponse | TChatRegenerateTitleFailedResponse;

export type TChatSaveTabsSuccessResponse = { success: true };

export type TChatSaveTabsFailedResponse = { error: string, success: false };

export type TChatSaveTabsResponse = TChatSaveTabsSuccessResponse | TChatSaveTabsFailedResponse;

export type TChatUpdateTitleSuccessResponse = { success: true };

export type TChatUpdateTitleFailedResponse = { error: string, success: false };

export type TChatUpdateTitleResponse = TChatUpdateTitleSuccessResponse | TChatUpdateTitleFailedResponse;

export type TPromptSelectResponse = Record<string, never>;

// Streaming response - the actual content is sent via CHAT_STREAM_CHUNK events
// This response just acknowledges the stream was started
export type TChatSendMessageStreamSuccessResponse = { started: true };

export type TChatSendMessageStreamFailedResponse = { error: string, started: false };

export type TChatSendMessageStreamResponse = TChatSendMessageStreamSuccessResponse | TChatSendMessageStreamFailedResponse;

export type TMESSAGE_STOP_STREAMResponse = { stopped: boolean };

export type TIpcResponsePayloadMap = {
  [EIpcEvent.CHAT_CREATE]: TChatCreateSessionResponse,
  [EIpcEvent.CHAT_DELETE]: TChatDeleteResponse,
  [EIpcEvent.CHAT_GET]: TChatGetResponse,
  [EIpcEvent.CHAT_LIST]: TChatListChatsResponse,
  [EIpcEvent.MESSAGES_LOAD]: TChatLoadMessagesResponse,
  [EIpcEvent.TABS_LOAD]: TChatLoadTabsResponse,
  [EIpcEvent.CHAT_OPEN]: TChatOpenResponse,
  [EIpcEvent.CHAT_REGENERATE_TITLE]: TChatRegenerateTitleResponse,
  [EIpcEvent.CHAT_UPDATE_TITLE]: TChatUpdateTitleResponse,
  [EIpcEvent.TABS_SAVE]: TChatSaveTabsResponse,
  [EIpcEvent.MESSAGE_SEND_STREAM]: TChatSendMessageStreamResponse,
  [EIpcEvent.MESSAGE_STOP_STREAM]: TMESSAGE_STOP_STREAMResponse,
  [EIpcEvent.ENV_GET]: TEnvGetResponse,
  [EIpcEvent.MODEL_CONTEXT_LENGTH]: TModelContextLengthResponse,
  [EIpcEvent.MODEL_LIST]: TModelListResponse,
  [EIpcEvent.PROMPT_SELECT]: TPromptSelectResponse,
  [EIpcEvent.SETTINGS_LOAD]: TSettingsLoadResponse,
  [EIpcEvent.SETTINGS_SAVE]: TSettingsSaveResponse,
};

type TCheckedMap = TEnsureAllKeysMap<EIpcEvent, TIpcResponsePayloadMap>;

export type TIpcResponsePayload<K extends EIpcEvent> = TCheckedMap[K];
