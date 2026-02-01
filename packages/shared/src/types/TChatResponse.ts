import type { IMessageStatistics } from '../interfaces/IMessageStatistics';

export type TChatSuccessResponse = {
  chatId?: number,
  result: string,
  statistics?: IMessageStatistics,
};

export type TChatFailedResponse = {
  chatId?: number,
  error: string,
};

export type TChatResponse = TChatSuccessResponse | TChatFailedResponse;
