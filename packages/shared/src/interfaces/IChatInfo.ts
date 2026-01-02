/**
 * Chat information structure
 * Used for representing chat session metadata
 */
export interface IChatInfo {
  id: number;
  title: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
}
