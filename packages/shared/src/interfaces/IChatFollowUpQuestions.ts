/**
 * Payload for CHAT_FOLLOW_UP_QUESTIONS IPC event (main → renderer)
 * Sent when follow-up questions have been generated for a chat after the assistant reply completes
 */
export interface IChatFollowUpQuestions {
  chatId: number;
  questions: string[];
}
