const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const ValidationUtils = require('../shared/ValidationUtils');
const ErrorHandler = require('../shared/ErrorHandler');

/**
 * ConfigManager - Handles all application configuration and settings
 * Design Pattern: Service pattern for configuration management
 */
class ConfigManager {
  constructor() {
    this.settingsFile = path.join(app.getPath('userData'), 'app-settings.json');
    this.defaultSettings = {
      theme: 'system',
      shortcuts: {},
      version: '1.0.0'
    };
  }

  /**
   * Load settings from file
   * @returns {Promise<Object>} Settings object
   */
  async loadSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // Validate and merge with defaults
      const validatedSettings = this.validateAndMergeSettings(settings);
      
      log.info(`Settings loaded: theme = ${validatedSettings.theme}, shortcuts = ${Object.keys(validatedSettings.shortcuts).length} items`);
      return validatedSettings;
    } catch (error) {
      log.info('No saved settings found or corrupted, using defaults');
      return { ...this.defaultSettings };
    }
  }

  /**
   * Save settings to file
   * @param {Object} settings - Settings to save
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveSettings(settings) {
    return ErrorHandler.withErrorHandling(async () => {
      // Validate settings input
      const validation = ValidationUtils.validateSettings(settings);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      const validatedSettings = this.validateAndMergeSettings(validation.sanitized);
      
      // Add metadata
      validatedSettings.lastUpdated = new Date().toISOString();
      
      // Ensure the userData directory exists
      const userDataDir = app.getPath('userData');
      await fs.mkdir(userDataDir, { recursive: true });
      
      await fs.writeFile(this.settingsFile, JSON.stringify(validatedSettings, null, 2));
      log.info(`Settings saved: theme = ${validatedSettings.theme}, shortcuts = ${Object.keys(validatedSettings.shortcuts).length} items`);
      
      return ErrorHandler.createSuccessResponse('Settings saved successfully', 'saveSettings');
    }, 'saveSettings', ErrorHandler.handleConfigError);
  }

  /**
   * Validate settings and merge with defaults
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validated settings
   */
  validateAndMergeSettings(settings) {
    const result = { ...this.defaultSettings };
    
    if (settings && typeof settings === 'object') {
      // Validate theme
      if (this.isValidTheme(settings.theme)) {
        result.theme = settings.theme;
      }
      
      // Validate shortcuts
      if (settings.shortcuts && typeof settings.shortcuts === 'object') {
        result.shortcuts = { ...settings.shortcuts };
      }
      
      // Keep version if valid
      if (typeof settings.version === 'string') {
        result.version = settings.version;
      }
    }
    
    return result;
  }

  /**
   * Validate theme value
   * @param {string} theme - Theme to validate
   * @returns {boolean} Whether theme is valid
   */
  isValidTheme(theme) {
    const validation = ValidationUtils.validateTheme(theme);
    return validation.isValid;
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return { ...this.defaultSettings };
  }

  /**
   * Get settings file path
   * @returns {string} Path to settings file
   */
  getSettingsFilePath() {
    return this.settingsFile;
  }
}

module.exports = ConfigManager;