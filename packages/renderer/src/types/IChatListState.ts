import type { IChatInfo } from '@writing-tools/shared';

export interface IChatListState {
  readonly chats: IChatInfo[];
  readonly deletingChatId: number | null;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly regeneratingChatId?: number | null;
}
