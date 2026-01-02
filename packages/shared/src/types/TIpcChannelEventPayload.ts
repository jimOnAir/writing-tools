/* eslint-disable @stylistic/indent */
/* eslint-disable @stylistic/operator-linebreak */
import type { EIpcChannel } from '../enum/EIpcChannel';
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { IChatMessage } from '../interfaces/IChatMessage';
import type { ISettings } from '../interfaces/ISettings';

export type TIpcEventPayload<K extends EIpcEvent> =
  K extends EIpcEvent.SETTINGS_SAVE ? ISettings :
  K extends EIpcEvent.SETTINGS_LOAD ? object :
  K extends EIpcEvent.MODEL_LIST ? { provider: 'ollama' | 'lmstudio' } :
  K extends EIpcEvent.CHAT_SEND_MESSAGE ? { messages: IChatMessage [] } :
  K extends EIpcEvent.ENV_GET ? object :
  K extends EIpcEvent.PROMPT_SELECT ? { prompt: string } :
never;

export type TIpcEvent <T extends EIpcChannel, K extends EIpcEvent> = {
  channel: T,
  event: K,
  payload: TIpcEventPayload<K>,
};
