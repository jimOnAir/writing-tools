export type TChatSuccessResponse = {
  result: string,
  chatId?: number,
};

export type TChatFailedResponse = {
  error: string,
  chatId?: number,
};

export type TChatResponse = TChatSuccessResponse | TChatFailedResponse;
