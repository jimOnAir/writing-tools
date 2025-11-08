import { logger } from '@writing-tools/shared';
import type { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    }).catch((error: unknown) => {
      const errorText = error instanceof Error
        ? error.message
        : String(error);
      logger.error('Error loading web-vitals: %s', errorText);
    });
  }
};

export default reportWebVitals;
