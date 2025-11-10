import type { EIpcRendererEvent } from '@writing-tools/shared';

export type TIpcRenderListener = (event: EIpcRendererEvent, ...args: any[]) => void;
