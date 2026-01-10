export interface ITitleGenerationService {
  generateTitleIfNeeded: (chatId: number) => Promise<void>;
}
