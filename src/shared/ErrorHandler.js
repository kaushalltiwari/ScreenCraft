const log = require('electron-log');

/**
 * ErrorHandler - Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */
class ErrorHandler {
  /**
   * Standard error response format
   * @param {string} message - Error message
   * @param {string} operation - Operation that failed
   * @param {Error} originalError - Original error object
   * @returns {Object} Standardized error response
   */
  static createErrorResponse(message, operation = 'Unknown operation', originalError = null) {
    const errorResponse = {
      success: false,
      error: message,
      operation: operation,
      timestamp: new Date().toISOString()
    };

    if (originalError) {
      errorResponse.originalMessage = originalError.message;
      errorResponse.stack = originalError.stack;
    }

    return errorResponse;
  }

  /**
   * Handle file operation errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - Description of the file operation
   * @param {string} filePath - File path involved (optional)
   * @returns {Object} Standardized error response
   */
  static handleFileError(error, operation, filePath = null) {
    const message = `File operation failed: ${operation}`;
    log.error(message, { error: error.message, filePath });
    
    const response = this.createErrorResponse(message, operation, error);
    if (filePath) {
      response.filePath = filePath;
    }
    
    return response;
  }

  /**
   * Handle screen capture errors
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where error occurred
   * @param {Object} details - Additional details (optional)
   * @returns {Object} Standardized error response
   */
  static handleScreenCaptureError(error, context, details = null) {
    const message = `Screen capture failed: ${context}`;
    log.error(message, { error: error.message, details });
    
    const response = this.createErrorResponse(message, context, error);
    if (details) {
      response.details = details;
    }
    
    return response;
  }

  /**
   * Handle validation errors
   * @param {Array<string>} validationErrors - Array of validation error messages
   * @param {string} operation - Operation being validated
   * @param {Object} data - Data that failed validation (optional, for debugging)
   * @returns {Object} Standardized error response
   */
  static handleValidationError(validationErrors, operation, data = null) {
    const message = `Validation failed for ${operation}: ${validationErrors.join(', ')}`;
    log.warn(message, { validationErrors, data });
    
    return {
      success: false,
      error: message,
      operation: operation,
      validationErrors: validationErrors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle IPC communication errors
   * @param {Error} error - The error that occurred
   * @param {string} channel - IPC channel name
   * @param {Object} data - Data being processed (optional)
   * @returns {Object} Standardized error response
   */
  static handleIPCError(error, channel, data = null) {
    const message = `IPC communication failed on channel '${channel}'`;
    log.error(message, { error: error.message, channel, data });
    
    const response = this.createErrorResponse(message, `IPC:${channel}`, error);
    response.channel = channel;
    
    return response;
  }

  /**
   * Handle window management errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - Window operation description
   * @param {number} windowId - Window ID (optional)
   * @returns {Object} Standardized error response
   */
  static handleWindowError(error, operation, windowId = null) {
    const message = `Window operation failed: ${operation}`;
    log.error(message, { error: error.message, windowId });
    
    const response = this.createErrorResponse(message, operation, error);
    if (windowId) {
      response.windowId = windowId;
    }
    
    return response;
  }

  /**
   * Handle configuration/settings errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - Configuration operation
   * @param {Object} settings - Settings involved (optional)
   * @returns {Object} Standardized error response
   */
  static handleConfigError(error, operation, settings = null) {
    const message = `Configuration operation failed: ${operation}`;
    log.error(message, { error: error.message, settings });
    
    const response = this.createErrorResponse(message, operation, error);
    if (settings) {
      response.settingsInvolved = Object.keys(settings);
    }
    
    return response;
  }

  /**
   * Handle theme management errors
   * @param {Error} error - The error that occurred
   * @param {string} operation - Theme operation
   * @param {string} theme - Theme involved (optional)
   * @returns {Object} Standardized error response
   */
  static handleThemeError(error, operation, theme = null) {
    const message = `Theme operation failed: ${operation}`;
    log.error(message, { error: error.message, theme });
    
    const response = this.createErrorResponse(message, operation, error);
    if (theme) {
      response.theme = theme;
    }
    
    return response;
  }

  /**
   * Handle initialization errors
   * @param {Error} error - The error that occurred
   * @param {string} component - Component that failed to initialize
   * @returns {Object} Standardized error response
   */
  static handleInitializationError(error, component) {
    const message = `Failed to initialize ${component}`;
    log.error(message, { error: error.message, component });
    
    const response = this.createErrorResponse(message, `Initialize:${component}`, error);
    response.component = component;
    
    return response;
  }

  /**
   * Create a success response (for consistency with error responses)
   * @param {string} message - Success message
   * @param {string} operation - Operation that succeeded
   * @param {Object} data - Additional data (optional)
   * @returns {Object} Standardized success response
   */
  static createSuccessResponse(message, operation = 'Unknown operation', data = null) {
    const response = {
      success: true,
      message: message,
      operation: operation,
      timestamp: new Date().toISOString()
    };

    if (data) {
      response.data = data;
    }

    return response;
  }

  /**
   * Wrapper for async operations with standardized error handling
   * @param {Function} operation - Async operation to execute
   * @param {string} operationName - Name of the operation for logging
   * @param {Function} errorHandler - Specific error handler function
   * @returns {Promise<Object>} Result of operation or error response
   */
  static async withErrorHandling(operation, operationName, errorHandler = null) {
    try {
      const result = await operation();
      
      // If result is already a response object, return it
      if (result && typeof result === 'object' && 'success' in result) {
        return result;
      }
      
      // Otherwise, wrap in success response
      return this.createSuccessResponse('Operation completed successfully', operationName, result);
      
    } catch (error) {
      log.error(`Error in ${operationName}:`, error);
      
      // Use specific error handler if provided
      if (errorHandler && typeof errorHandler === 'function') {
        return errorHandler(error, operationName);
      }
      
      // Default error handling
      return this.createErrorResponse(error.message || 'Unknown error occurred', operationName, error);
    }
  }

  /**
   * Log and return error for promise rejection
   * @param {Error} error - Error to handle
   * @param {string} context - Context information
   * @returns {Promise<never>} Rejected promise with standardized error
   */
  static rejectWithError(error, context) {
    const errorResponse = this.createErrorResponse(error.message, context, error);
    log.error(`Rejecting promise in ${context}:`, errorResponse);
    return Promise.reject(errorResponse);
  }

  /**
   * Sanitize error for safe client transmission (removes sensitive data)
   * @param {Object} errorResponse - Error response to sanitize
   * @returns {Object} Sanitized error response
   */
  static sanitizeErrorForClient(errorResponse) {
    const sanitized = {
      success: errorResponse.success,
      error: errorResponse.error,
      operation: errorResponse.operation,
      timestamp: errorResponse.timestamp
    };

    // Only include validation errors (safe for client)
    if (errorResponse.validationErrors) {
      sanitized.validationErrors = errorResponse.validationErrors;
    }

    // Don't include stack traces or original messages in production
    return sanitized;
  }
}

module.exports = ErrorHandler;