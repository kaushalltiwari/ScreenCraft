/**
 * ValidationUtils - Input validation utilities
 * Centralized validation logic for improved security and consistency
 */

class ValidationUtils {
  /**
   * Validate selection data from overlay
   * @param {Object} selectionData - Selection data to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: Object}}
   */
  static validateSelectionData(selectionData) {
    const errors = [];
    
    if (!selectionData || typeof selectionData !== 'object') {
      return { isValid: false, errors: ['Selection data must be an object'] };
    }

    // Validate coordinates
    const { x, y, width, height, screenIndex } = selectionData;

    // Check if all required fields exist and are numbers
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      errors.push('X coordinate must be a valid number');
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      errors.push('Y coordinate must be a valid number');
    }
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
      errors.push('Width must be a positive number');
    }
    if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
      errors.push('Height must be a positive number');
    }

    // Validate optional screenIndex
    if (screenIndex !== undefined && (typeof screenIndex !== 'number' || screenIndex < 0 || !Number.isInteger(screenIndex))) {
      errors.push('Screen index must be a non-negative integer');
    }

    // Check minimum selection size
    const MIN_SELECTION_SIZE = 10;
    if (width < MIN_SELECTION_SIZE) {
      errors.push(`Width must be at least ${MIN_SELECTION_SIZE} pixels`);
    }
    if (height < MIN_SELECTION_SIZE) {
      errors.push(`Height must be at least ${MIN_SELECTION_SIZE} pixels`);
    }

    // Check maximum reasonable size (prevent memory issues)
    const MAX_SELECTION_SIZE = 32767; // Max signed 16-bit integer
    if (width > MAX_SELECTION_SIZE) {
      errors.push(`Width must not exceed ${MAX_SELECTION_SIZE} pixels`);
    }
    if (height > MAX_SELECTION_SIZE) {
      errors.push(`Height must not exceed ${MAX_SELECTION_SIZE} pixels`);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Return sanitized data
    return {
      isValid: true,
      errors: [],
      sanitized: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        screenIndex: screenIndex !== undefined ? Math.round(screenIndex) : 0
      }
    };
  }

  /**
   * Validate theme value
   * @param {string} theme - Theme to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: string}}
   */
  static validateTheme(theme) {
    const validThemes = ['light', 'dark', 'system'];
    
    if (typeof theme !== 'string') {
      return { isValid: false, errors: ['Theme must be a string'] };
    }

    if (!validThemes.includes(theme)) {
      return { 
        isValid: false, 
        errors: [`Theme must be one of: ${validThemes.join(', ')}`] 
      };
    }

    return { isValid: true, errors: [], sanitized: theme };
  }

  /**
   * Validate file path
   * @param {string} filePath - File path to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: string}}
   */
  static validateFilePath(filePath) {
    const errors = [];

    if (typeof filePath !== 'string') {
      return { isValid: false, errors: ['File path must be a string'] };
    }

    if (filePath.trim().length === 0) {
      return { isValid: false, errors: ['File path cannot be empty'] };
    }

    // Basic path traversal protection
    if (filePath.includes('..')) {
      errors.push('File path cannot contain ".." sequences');
    }

    // Check for null bytes (security)
    if (filePath.includes('\0')) {
      errors.push('File path cannot contain null bytes');
    }

    // Basic length check
    if (filePath.length > 4096) {
      errors.push('File path is too long (max 4096 characters)');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], sanitized: filePath.trim() };
  }

  /**
   * Validate preview action data
   * @param {Object} actionData - Action data to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: Object}}
   */
  static validatePreviewActionData(actionData) {
    const errors = [];

    if (!actionData || typeof actionData !== 'object') {
      return { isValid: false, errors: ['Action data must be an object'] };
    }

    const { action, filePath, borders } = actionData;
    const validActions = ['copy-image', 'copy-path', 'save'];

    // Validate action
    if (typeof action !== 'string' || !validActions.includes(action)) {
      errors.push(`Action must be one of: ${validActions.join(', ')}`);
    }

    // Validate filePath if provided
    if (filePath !== undefined) {
      const filePathValidation = this.validateFilePath(filePath);
      if (!filePathValidation.isValid) {
        errors.push(...filePathValidation.errors.map(err => `File path: ${err}`));
      }
    }

    // Validate borders if provided (should be data URL)
    if (borders !== undefined) {
      if (typeof borders !== 'string') {
        errors.push('Borders data must be a string');
      } else if (!borders.startsWith('data:image/')) {
        errors.push('Borders data must be a valid data URL');
      } else if (borders.length > 50 * 1024 * 1024) { // 50MB limit
        errors.push('Borders data is too large (max 50MB)');
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      sanitized: {
        action,
        filePath: filePath ? filePath.trim() : undefined,
        borders
      }
    };
  }

  /**
   * Validate window ID
   * @param {number} windowId - Window ID to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: number}}
   */
  static validateWindowId(windowId) {
    if (typeof windowId !== 'number' || !Number.isFinite(windowId) || !Number.isInteger(windowId) || windowId <= 0) {
      return { isValid: false, errors: ['Window ID must be a positive integer'] };
    }

    return { isValid: true, errors: [], sanitized: windowId };
  }

  /**
   * Validate settings object
   * @param {Object} settings - Settings object to validate
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: Object}}
   */
  static validateSettings(settings) {
    const errors = [];

    if (!settings || typeof settings !== 'object') {
      return { isValid: false, errors: ['Settings must be an object'] };
    }

    const sanitized = {};

    // Validate theme if provided
    if (settings.theme !== undefined) {
      const themeValidation = this.validateTheme(settings.theme);
      if (!themeValidation.isValid) {
        errors.push(...themeValidation.errors.map(err => `Theme: ${err}`));
      } else {
        sanitized.theme = themeValidation.sanitized;
      }
    }

    // Validate shortcuts if provided
    if (settings.shortcuts !== undefined) {
      if (typeof settings.shortcuts !== 'object' || settings.shortcuts === null) {
        errors.push('Shortcuts must be an object');
      } else {
        sanitized.shortcuts = { ...settings.shortcuts };
      }
    }

    // Validate version if provided
    if (settings.version !== undefined) {
      if (typeof settings.version !== 'string') {
        errors.push('Version must be a string');
      } else if (settings.version.length > 20) {
        errors.push('Version string is too long (max 20 characters)');
      } else {
        sanitized.version = settings.version;
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], sanitized };
  }

  /**
   * General utility to validate that a value is a non-empty string
   * @param {any} value - Value to validate
   * @param {string} fieldName - Name of the field for error messages
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: string}}
   */
  static validateString(value, fieldName = 'Value') {
    if (typeof value !== 'string') {
      return { isValid: false, errors: [`${fieldName} must be a string`] };
    }

    if (value.trim().length === 0) {
      return { isValid: false, errors: [`${fieldName} cannot be empty`] };
    }

    return { isValid: true, errors: [], sanitized: value.trim() };
  }

  /**
   * Validate numeric bounds (coordinates, dimensions, etc.)
   * @param {number} value - Value to validate
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Validation options
   * @param {number} options.min - Minimum value (inclusive)
   * @param {number} options.max - Maximum value (inclusive)
   * @param {boolean} options.integer - Whether value must be integer
   * @returns {{isValid: boolean, errors: Array<string>, sanitized?: number}}
   */
  static validateNumericBounds(value, fieldName, options = {}) {
    const { min = -Infinity, max = Infinity, integer = false } = options;
    const errors = [];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { isValid: false, errors: [`${fieldName} must be a finite number`] };
    }

    if (integer && !Number.isInteger(value)) {
      errors.push(`${fieldName} must be an integer`);
    }

    if (value < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (value > max) {
      errors.push(`${fieldName} must not exceed ${max}`);
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], sanitized: integer ? Math.round(value) : value };
  }
}

module.exports = ValidationUtils;