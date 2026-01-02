export type TChatSuccessResponse = {
  chatId?: number,
  result: string,
};

export type TChatFailedResponse = {
  chatId?: number,
  error: string,
};

export type TChatResponse = TChatSuccessResponse | TChatFailedResponse;
