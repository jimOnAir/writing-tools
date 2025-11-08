/* eslint-disable @stylistic/indent */
/* eslint-disable @stylistic/operator-linebreak */
import type { EIpcEvent } from '../enum/EIpcEvent';
import type { ISettings } from '../interfaces/ISettings';

export type TIpcResponsePayload<K extends EIpcEvent> =
  K extends EIpcEvent.ENV_GET ? { platform: NodeJS.Platform, os: string, arch: string } :
  K extends EIpcEvent.MODEL_LIST ? { models: string[] } | { error: string } :
  K extends EIpcEvent.SETTINGS_LOAD ? ISettings :
  K extends EIpcEvent.SETTINGS_SAVE ? { success: true } | { success: false, error: string } :
  K extends EIpcEvent.CHAT_SEND_MESSAGE ? { response: string } | { error: string } :
never;
