import { Logger, logger } from './logger';

describe('Logger', () => {
  let mockConsoleDebug: jest.SpyInstance;
  let mockConsoleInfo: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let testLogger: Logger;

  beforeEach(() => {
    mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
    mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    testLogger = new Logger();
    testLogger.setEnvironment('test');
    testLogger.setLevel('debug');
  });

  afterEach(() => {
    mockConsoleDebug.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('debug', () => {
    it('logs debug message when level is debug', () => {
      testLogger.setLevel('debug');
      testLogger.debug('Test debug message');

      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug message'),
      );
    });

    it('does not log debug message when level is info', () => {
      testLogger.setLevel('info');
      testLogger.debug('Test debug message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('formats message with arguments', () => {
      testLogger.setLevel('debug');
      testLogger.debug('Test %s message %s', 'debug', 'here');

      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug message here'),
      );
    });
  });

  describe('info', () => {
    it('logs info message when level is info', () => {
      testLogger.setLevel('info');
      testLogger.info('Test info message');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message'),
      );
    });

    it('logs info message when level is debug', () => {
      testLogger.setLevel('debug');
      testLogger.info('Test info message');

      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('does not log info message when level is warn', () => {
      testLogger.setLevel('warn');
      testLogger.info('Test info message');

      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('formats message with arguments', () => {
      testLogger.setLevel('info');
      testLogger.info('Test %s message', 'info');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message'),
      );
    });
  });

  describe('warn', () => {
    it('logs warn message when level is warn', () => {
      testLogger.setLevel('warn');
      testLogger.warn('Test warn message');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warn message'),
      );
    });

    it('logs warn message when level is debug', () => {
      testLogger.setLevel('debug');
      testLogger.warn('Test warn message');

      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('does not log warn message when level is error', () => {
      testLogger.setLevel('error');
      testLogger.warn('Test warn message');

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('formats message with arguments', () => {
      testLogger.setLevel('warn');
      testLogger.warn('Test %s message', 'warn');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warn message'),
      );
    });
  });

  describe('error', () => {
    it('logs error message when level is error', () => {
      testLogger.setLevel('error');
      testLogger.error('Test error message');

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message'),
      );
    });

    it('logs error message when level is debug', () => {
      testLogger.setLevel('debug');
      testLogger.error('Test error message');

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('always logs error messages regardless of level', () => {
      testLogger.setLevel('error');
      testLogger.error('Test error message');

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('formats message with arguments', () => {
      testLogger.setLevel('error');
      testLogger.error('Test %s message', 'error');

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error message'),
      );
    });
  });

  describe('setLevel', () => {
    it('sets minimum log level', () => {
      testLogger.setLevel('warn');
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  describe('setEnvironment', () => {
    it('filters logs based on environment', () => {
      testLogger.setEnvironment('production');
      testLogger.debug('Debug message');
      testLogger.info('Info message');

      // Production environment has min level of 'info'
      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('allows all logs in test environment', () => {
      testLogger.setEnvironment('test');
      testLogger.setLevel('debug');
      testLogger.debug('Debug message');
      testLogger.info('Info message');

      expect(mockConsoleDebug).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('allows all logs in development environment', () => {
      testLogger.setEnvironment('development');
      testLogger.setLevel('debug');
      testLogger.debug('Debug message');
      testLogger.info('Info message');

      expect(mockConsoleDebug).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('includes timestamp in log message', () => {
      testLogger.setLevel('info');
      testLogger.info('Test message');

      expect(mockConsoleInfo).toHaveBeenCalled();
      const calls = mockConsoleInfo.mock.calls as Array<[string]>;
      expect(calls[0]?.[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles messages without format arguments', () => {
      testLogger.setLevel('info');
      testLogger.info('Simple message');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Simple message'),
      );
    });

    it('handles multiple format arguments', () => {
      testLogger.setLevel('info');
      testLogger.info('Message %s with %s arguments', 'first', 'multiple');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('Message first with multiple arguments'),
      );
    });
  });

  describe('default logger instance', () => {
    it('exports a default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('default logger can log messages', () => {
      logger.setLevel('info');
      logger.info('Test message');

      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });
});
