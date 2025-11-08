export type TFetchModelsOllamaSuccessResponse = {
  models: string[],
};

export type TFetchModelsOllamaFailedResponse = {
  error: string,
};

export type TFetchModelsOllamaResponse = TFetchModelsOllamaSuccessResponse | TFetchModelsOllamaFailedResponse;
