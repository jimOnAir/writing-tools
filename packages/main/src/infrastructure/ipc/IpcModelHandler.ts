import type { TIpcEvent, EIpcEvent } from '@writing-tools/shared';
import { EIpcChannel } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IModelService } from '../../domains/llm/IModelService';

import type { IIpcModelHandler } from './IIpcModelHandler';

export type TChannelEventPayloadModel = TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST>;

export class IpcModelHandler implements IIpcModelHandler {
  private readonly modelService: IModelService;

  public constructor(modelService: IModelService) {
    this.modelService = modelService;
  }

  public register(): void {
    ipcMain.handle(EIpcChannel.MODEL, async (_, data: TChannelEventPayloadModel) => {
      return this.modelService.fetchModels(data.payload.provider);
    });
  }
}
