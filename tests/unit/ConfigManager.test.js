const fs = require('fs').promises;

// Mock the dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-userdata')
  }
}));

jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const ConfigManager = require('../../src/main/ConfigManager');
const { app } = require('electron');

describe('ConfigManager', () => {
  let configManager;
  
  beforeEach(() => {
    configManager = new ConfigManager();
    jest.clearAllMocks();
    
    // Mock app.getPath
    app.getPath.mockReturnValue('/tmp/test-userdata');
  });

  describe('loadSettings', () => {
    test('loads valid settings from file', async () => {
      const mockSettings = {
        theme: 'dark',
        shortcuts: { 'screenshot': 'Ctrl+Shift+S' },
        version: '1.0.0'
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await configManager.loadSettings();

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('app-settings.json'),
        'utf8'
      );
      expect(result.theme).toBe('dark');
      expect(result.shortcuts).toEqual({ 'screenshot': 'Ctrl+Shift+S' });
    });

    test('returns defaults when file does not exist', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await configManager.loadSettings();

      expect(result).toEqual({
        theme: 'system',
        shortcuts: {},
        version: '1.0.0'
      });
    });

    test('returns defaults when file is corrupted', async () => {
      fs.readFile.mockResolvedValue('invalid json');

      const result = await configManager.loadSettings();

      expect(result.theme).toBe('system');
    });

    test('validates and sanitizes loaded settings', async () => {
      const mockSettings = {
        theme: 'invalid-theme',
        shortcuts: { 'test': 'value' },
        version: '1.0.0',
        maliciousField: 'should be ignored'
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await configManager.loadSettings();

      // Invalid theme should be replaced with default
      expect(result.theme).toBe('system');
      expect(result.shortcuts).toEqual({ 'test': 'value' });
      expect(result.maliciousField).toBeUndefined();
    });
  });

  describe('saveSettings', () => {
    test('saves valid settings to file', async () => {
      const settings = {
        theme: 'dark',
        shortcuts: { 'screenshot': 'Ctrl+Shift+S' },
        version: '1.0.0'
      };

      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const result = await configManager.saveSettings(settings);

      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-userdata', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('app-settings.json'),
        expect.stringContaining('"theme": "dark"')
      );
    });

    test('validates settings before saving', async () => {
      const invalidSettings = {
        theme: 'invalid-theme',
        shortcuts: 'not-an-object'
      };

      const result = await configManager.saveSettings(invalidSettings);

      expect(result.success).toBe(false);
      expect(result.operation).toBe('saveSettings');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test('handles file system errors', async () => {
      const settings = { theme: 'dark' };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const result = await configManager.saveSettings(settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration operation failed');
    });

    test('adds metadata to saved settings', async () => {
      const settings = { theme: 'light' };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const mockDate = new Date('2025-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      await configManager.saveSettings(settings);

      const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(savedData.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
      expect(savedData.version).toBe('1.0.0');

      global.Date.mockRestore();
    });
  });

  describe('validateAndMergeSettings', () => {
    test('merges valid settings with defaults', () => {
      const settings = {
        theme: 'dark',
        shortcuts: { 'test': 'value' }
      };

      const result = configManager.validateAndMergeSettings(settings);

      expect(result).toEqual({
        theme: 'dark',
        shortcuts: { 'test': 'value' },
        version: '1.0.0'
      });
    });

    test('ignores invalid theme', () => {
      const settings = {
        theme: 'invalid-theme',
        shortcuts: { 'test': 'value' }
      };

      const result = configManager.validateAndMergeSettings(settings);

      expect(result.theme).toBe('system'); // default
    });

    test('ignores invalid shortcuts', () => {
      const settings = {
        theme: 'dark',
        shortcuts: 'not-an-object'
      };

      const result = configManager.validateAndMergeSettings(settings);

      expect(result.shortcuts).toEqual({}); // default
    });

    test('handles null input', () => {
      const result = configManager.validateAndMergeSettings(null);

      expect(result).toEqual({
        theme: 'system',
        shortcuts: {},
        version: '1.0.0'
      });
    });
  });

  describe('isValidTheme', () => {
    test('accepts valid themes', () => {
      expect(configManager.isValidTheme('light')).toBe(true);
      expect(configManager.isValidTheme('dark')).toBe(true);
      expect(configManager.isValidTheme('system')).toBe(true);
    });

    test('rejects invalid themes', () => {
      expect(configManager.isValidTheme('invalid')).toBe(false);
      expect(configManager.isValidTheme('')).toBe(false);
      expect(configManager.isValidTheme(null)).toBe(false);
      expect(configManager.isValidTheme(123)).toBe(false);
    });
  });

  describe('getDefaultSettings', () => {
    test('returns default settings object', () => {
      const defaults = configManager.getDefaultSettings();

      expect(defaults).toEqual({
        theme: 'system',
        shortcuts: {},
        version: '1.0.0'
      });
    });

    test('returns new object each time', () => {
      const defaults1 = configManager.getDefaultSettings();
      const defaults2 = configManager.getDefaultSettings();

      expect(defaults1).not.toBe(defaults2); // Different object references
      expect(defaults1).toEqual(defaults2); // Same content
    });
  });

  describe('getSettingsFilePath', () => {
    test('returns correct settings file path', () => {
      const path = configManager.getSettingsFilePath();

      expect(path).toContain('app-settings.json');
      expect(path).toMatch(/[\/\\]tmp[\/\\]test-userdata/);
    });
  });
});