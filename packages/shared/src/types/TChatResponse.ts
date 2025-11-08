export type TChatSuccessResponse = {
  result: string,
};

export type TChatFailedResponse = {
  error: string,
};

export type TChatResponse = TChatSuccessResponse | TChatFailedResponse;
