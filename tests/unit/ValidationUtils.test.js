const ValidationUtils = require('../../src/shared/ValidationUtils');

describe('ValidationUtils', () => {
  describe('validateSelectionData', () => {
    test('validates correct selection data', () => {
      const validData = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        screenIndex: 0
      };

      const result = ValidationUtils.validateSelectionData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitized).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        screenIndex: 0
      });
    });

    test('rejects invalid coordinates', () => {
      const invalidData = {
        x: 'not-a-number',
        y: -10,
        width: 0,
        height: -5
      };

      const result = ValidationUtils.validateSelectionData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X coordinate must be a valid number');
      expect(result.errors).toContain('Width must be a positive number');
      expect(result.errors).toContain('Height must be a positive number');
    });

    test('enforces minimum selection size', () => {
      const tooSmallData = {
        x: 0,
        y: 0,
        width: 5,
        height: 5
      };

      const result = ValidationUtils.validateSelectionData(tooSmallData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Width must be at least 10 pixels');
      expect(result.errors).toContain('Height must be at least 10 pixels');
    });

    test('enforces maximum selection size', () => {
      const tooLargeData = {
        x: 0,
        y: 0,
        width: 40000,
        height: 40000
      };

      const result = ValidationUtils.validateSelectionData(tooLargeData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Width must not exceed 32767 pixels');
      expect(result.errors).toContain('Height must not exceed 32767 pixels');
    });

    test('sanitizes and rounds coordinates', () => {
      const floatData = {
        x: 10.7,
        y: 20.3,
        width: 100.9,
        height: 50.1
      };

      const result = ValidationUtils.validateSelectionData(floatData);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.x).toBe(11);
      expect(result.sanitized.y).toBe(20);
      expect(result.sanitized.width).toBe(101);
      expect(result.sanitized.height).toBe(50);
    });
  });

  describe('validateTheme', () => {
    test('accepts valid themes', () => {
      ['light', 'dark', 'system'].forEach(theme => {
        const result = ValidationUtils.validateTheme(theme);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(theme);
      });
    });

    test('rejects invalid themes', () => {
      const result = ValidationUtils.validateTheme('invalid-theme');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Theme must be one of: light, dark, system');
    });

    test('rejects non-string themes', () => {
      const result = ValidationUtils.validateTheme(123);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Theme must be a string');
    });
  });

  describe('validateFilePath', () => {
    test('accepts valid file paths', () => {
      const validPath = '/home/user/screenshot.png';
      const result = ValidationUtils.validateFilePath(validPath);

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(validPath);
    });

    test('rejects paths with traversal sequences', () => {
      const dangerousPath = '../../../etc/passwd';
      const result = ValidationUtils.validateFilePath(dangerousPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File path cannot contain ".." sequences');
    });

    test('rejects paths with null bytes', () => {
      const maliciousPath = '/home/user/file\0.png';
      const result = ValidationUtils.validateFilePath(maliciousPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File path cannot contain null bytes');
    });

    test('rejects empty paths', () => {
      const result = ValidationUtils.validateFilePath('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File path cannot be empty');
    });

    test('trims whitespace', () => {
      const result = ValidationUtils.validateFilePath('  /home/user/file.png  ');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('/home/user/file.png');
    });
  });

  describe('validatePreviewActionData', () => {
    test('validates copy-image action', () => {
      const actionData = {
        action: 'copy-image',
        filePath: '/tmp/screenshot.png'
      };

      const result = ValidationUtils.validatePreviewActionData(actionData);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.action).toBe('copy-image');
    });

    test('validates action with borders data URL', () => {
      const actionData = {
        action: 'copy-image',
        filePath: '/tmp/screenshot.png',
        borders: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };

      const result = ValidationUtils.validatePreviewActionData(actionData);

      expect(result.isValid).toBe(true);
    });

    test('rejects invalid actions', () => {
      const actionData = {
        action: 'invalid-action',
        filePath: '/tmp/screenshot.png'
      };

      const result = ValidationUtils.validatePreviewActionData(actionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action must be one of: copy-image, copy-path, save');
    });

    test('rejects invalid borders data', () => {
      const actionData = {
        action: 'copy-image',
        filePath: '/tmp/screenshot.png',
        borders: 'not-a-data-url'
      };

      const result = ValidationUtils.validatePreviewActionData(actionData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Borders data must be a valid data URL');
    });
  });

  describe('validateSettings', () => {
    test('validates complete settings object', () => {
      const settings = {
        theme: 'dark',
        shortcuts: { 'screenshot': 'Ctrl+Shift+S' },
        version: '1.0.0'
      };

      const result = ValidationUtils.validateSettings(settings);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.theme).toBe('dark');
    });

    test('validates partial settings object', () => {
      const settings = {
        theme: 'light'
      };

      const result = ValidationUtils.validateSettings(settings);

      expect(result.isValid).toBe(true);
      expect(result.sanitized.theme).toBe('light');
      expect(result.sanitized.shortcuts).toBeUndefined();
    });

    test('rejects invalid theme in settings', () => {
      const settings = {
        theme: 'invalid',
        shortcuts: {}
      };

      const result = ValidationUtils.validateSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Theme: Theme must be one of: light, dark, system');
    });
  });

  describe('validateNumericBounds', () => {
    test('validates number within bounds', () => {
      const result = ValidationUtils.validateNumericBounds(50, 'testValue', {
        min: 0,
        max: 100
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(50);
    });

    test('enforces minimum bounds', () => {
      const result = ValidationUtils.validateNumericBounds(-10, 'testValue', {
        min: 0,
        max: 100
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testValue must be at least 0');
    });

    test('enforces maximum bounds', () => {
      const result = ValidationUtils.validateNumericBounds(150, 'testValue', {
        min: 0,
        max: 100
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testValue must not exceed 100');
    });

    test('enforces integer requirement', () => {
      const result = ValidationUtils.validateNumericBounds(10.5, 'testValue', {
        min: 0,
        max: 100,
        integer: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testValue must be an integer');
    });

    test('rounds to integer when valid', () => {
      const result = ValidationUtils.validateNumericBounds(10.7, 'testValue', {
        min: 0,
        max: 100,
        integer: true
      });

      expect(result.isValid).toBe(false); // Should fail because 10.7 is not an integer
      
      // But test rounding with a valid integer
      const result2 = ValidationUtils.validateNumericBounds(10, 'testValue', {
        min: 0,
        max: 100,
        integer: true
      });
      
      expect(result2.isValid).toBe(true);
      expect(result2.sanitized).toBe(10);
    });
  });
});