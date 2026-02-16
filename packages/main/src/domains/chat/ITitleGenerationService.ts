export interface ITitleGenerationService {
  generateTitleIfNeeded: (chatId: number) => Promise<void>;
  regenerateTitle: (chatId: number) => Promise<string | null>;
}
