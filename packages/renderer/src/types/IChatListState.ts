import type { IChatInfo } from '@writing-tools/shared';

export interface IChatListState {
  readonly chats: IChatInfo[];
  readonly deletingChatId: number | null;
  readonly error: string | null;
  readonly isLoading: boolean;
}
