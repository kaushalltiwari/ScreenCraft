const ErrorHandler = require('../../src/shared/ErrorHandler');

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Mock Date.now for consistent timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createErrorResponse', () => {
    test('creates basic error response', () => {
      const result = ErrorHandler.createErrorResponse('Test error', 'test-operation');

      expect(result).toEqual({
        success: false,
        error: 'Test error',
        operation: 'test-operation',
        timestamp: '2025-01-01T00:00:00.000Z'
      });
    });

    test('includes original error details', () => {
      const originalError = new Error('Original message');
      originalError.stack = 'Error: Original message\n    at test';

      const result = ErrorHandler.createErrorResponse(
        'Wrapped error',
        'test-operation',
        originalError
      );

      expect(result.originalMessage).toBe('Original message');
      expect(result.stack).toBe('Error: Original message\n    at test');
    });
  });

  describe('handleFileError', () => {
    test('handles file operation errors', () => {
      const error = new Error('File not found');
      const result = ErrorHandler.handleFileError(error, 'read file', '/tmp/test.png');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File operation failed: read file');
      expect(result.operation).toBe('read file');
      expect(result.filePath).toBe('/tmp/test.png');
      expect(result.originalMessage).toBe('File not found');
    });

    test('handles file errors without file path', () => {
      const error = new Error('Permission denied');
      const result = ErrorHandler.handleFileError(error, 'create directory');

      expect(result.success).toBe(false);
      expect(result.filePath).toBeUndefined();
    });
  });

  describe('handleScreenCaptureError', () => {
    test('handles screen capture errors with details', () => {
      const error = new Error('Screen capture failed');
      const details = { screenIndex: 0, bounds: { x: 0, y: 0, width: 100, height: 50 } };
      
      const result = ErrorHandler.handleScreenCaptureError(error, 'capture screen', details);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Screen capture failed: capture screen');
      expect(result.details).toEqual(details);
    });
  });

  describe('handleValidationError', () => {
    test('handles validation errors', () => {
      const validationErrors = ['Width must be positive', 'Height must be positive'];
      const result = ErrorHandler.handleValidationError(
        validationErrors,
        'validateSelection',
        { width: -10, height: -5 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed for validateSelection: Width must be positive, Height must be positive');
      expect(result.validationErrors).toEqual(validationErrors);
    });
  });

  describe('handleIPCError', () => {
    test('handles IPC communication errors', () => {
      const error = new Error('IPC timeout');
      const result = ErrorHandler.handleIPCError(error, 'process-selection', { x: 10, y: 20 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('IPC communication failed on channel \'process-selection\'');
      expect(result.operation).toBe('IPC:process-selection');
      expect(result.channel).toBe('process-selection');
    });
  });

  describe('createSuccessResponse', () => {
    test('creates basic success response', () => {
      const result = ErrorHandler.createSuccessResponse('Operation completed', 'test-operation');

      expect(result).toEqual({
        success: true,
        message: 'Operation completed',
        operation: 'test-operation',
        timestamp: '2025-01-01T00:00:00.000Z'
      });
    });

    test('includes data in success response', () => {
      const data = { id: 1, name: 'test' };
      const result = ErrorHandler.createSuccessResponse(
        'Data retrieved',
        'getData',
        data
      );

      expect(result.data).toEqual(data);
    });
  });

  describe('withErrorHandling', () => {
    test('wraps successful operations', async () => {
      const operation = jest.fn().mockResolvedValue({ result: 'success' });
      
      const result = await ErrorHandler.withErrorHandling(operation, 'test-operation');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
    });

    test('handles operation failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      const result = await ErrorHandler.withErrorHandling(operation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed');
      expect(result.operation).toBe('test-operation');
    });

    test('uses custom error handler', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Custom error'));
      const customHandler = jest.fn().mockReturnValue({ success: false, custom: true });
      
      const result = await ErrorHandler.withErrorHandling(
        operation,
        'test-operation',
        customHandler
      );

      expect(customHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'test-operation'
      );
      expect(result.custom).toBe(true);
    });

    test('handles operations that return response objects', async () => {
      const responseObject = { success: true, message: 'Already formatted' };
      const operation = jest.fn().mockResolvedValue(responseObject);
      
      const result = await ErrorHandler.withErrorHandling(operation, 'test-operation');

      expect(result).toEqual(responseObject);
    });
  });

  describe('rejectWithError', () => {
    test('rejects with formatted error', async () => {
      const error = new Error('Test error');
      
      await expect(ErrorHandler.rejectWithError(error, 'test-context'))
        .rejects.toEqual({
          success: false,
          error: 'Test error',
          operation: 'test-context',
          timestamp: '2025-01-01T00:00:00.000Z',
          originalMessage: 'Test error',
          stack: error.stack
        });
    });
  });

  describe('sanitizeErrorForClient', () => {
    test('removes sensitive information from error', () => {
      const errorResponse = {
        success: false,
        error: 'Public error message',
        operation: 'test-operation',
        timestamp: '2025-01-01T00:00:00.000Z',
        originalMessage: 'Sensitive internal message',
        stack: 'Error stack trace',
        validationErrors: ['Field is required']
      };

      const sanitized = ErrorHandler.sanitizeErrorForClient(errorResponse);

      expect(sanitized).toEqual({
        success: false,
        error: 'Public error message',
        operation: 'test-operation',
        timestamp: '2025-01-01T00:00:00.000Z',
        validationErrors: ['Field is required']
      });
      
      expect(sanitized.originalMessage).toBeUndefined();
      expect(sanitized.stack).toBeUndefined();
    });

    test('preserves validation errors for client', () => {
      const errorResponse = {
        success: false,
        error: 'Validation failed',
        operation: 'validate-input',
        timestamp: '2025-01-01T00:00:00.000Z',
        validationErrors: ['Width must be positive', 'Height required']
      };

      const sanitized = ErrorHandler.sanitizeErrorForClient(errorResponse);

      expect(sanitized.validationErrors).toEqual(['Width must be positive', 'Height required']);
    });
  });
});