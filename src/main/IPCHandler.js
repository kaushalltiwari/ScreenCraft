const { ipcMain, BrowserWindow } = require('electron');
const log = require('electron-log');

/**
 * IPCHandler - Centralized IPC communication handler
 * Design Pattern: Command pattern for IPC message handling
 */
class IPCHandler {
  constructor() {
    this.handlers = new Map();
    this.isSetup = false;
  }

  /**
   * Initialize IPC handlers with dependencies
   * @param {Object} dependencies - Required dependencies
   * @param {Object} dependencies.screenCaptureManager - Screen capture manager
   * @param {Object} dependencies.configManager - Configuration manager
   * @param {Object} dependencies.themeManager - Theme manager
   * @param {Object} dependencies.windowManager - Window manager
   * @param {Function} dependencies.onPreviewAction - Preview action handler
   * @param {Function} dependencies.onQuit - Quit handler
   */
  initialize(dependencies) {
    if (this.isSetup) {
      log.warn('IPC handlers already setup');
      return;
    }

    const {
      screenCaptureManager,
      configManager,
      themeManager,
      windowManager,
      onPreviewAction,
      onQuit
    } = dependencies;

    this.setupHandlers({
      screenCaptureManager,
      configManager,
      themeManager,
      windowManager,
      onPreviewAction,
      onQuit
    });

    this.isSetup = true;
    log.info('IPC handlers setup complete');
  }

  /**
   * Setup all IPC handlers
   * @param {Object} deps - Dependencies
   * @private
   */
  setupHandlers(deps) {
    // Screenshot-related handlers
    this.registerHandler('trigger-screenshot', async () => {
      log.info('IPC: Screenshot triggered');
      return await deps.screenCaptureManager.startCapture();
    });

    // Note: process-selection is handled directly in main.js due to app context dependency

    this.registerHandler('close-overlay', () => {
      log.info('IPC: Closing overlay');
      deps.screenCaptureManager.cancelCapture();
    });

    // Preview window handlers
    this.registerHandler('preview-action', async (event, actionData) => {
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
      log.info(`IPC: Preview action ${actionData.action} for window ${windowId}`);
      
      if (deps.onPreviewAction) {
        return await deps.onPreviewAction(actionData, windowId);
      }
      return { success: false, message: 'No preview action handler' };
    });

    this.registerHandler('close-preview', (event) => {
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
      log.info(`IPC: Closing preview window ${windowId}`);
      
      if (windowId) {
        deps.windowManager.closePreviewWindow(windowId);
      }
    });

    this.registerHandler('get-open-windows', () => {
      return deps.windowManager.getOpenWindowsInfo();
    });

    // Theme handlers
    this.registerHandler('get-theme-info', () => {
      return deps.themeManager.getThemeInfo();
    });

    this.registerHandler('set-theme', async (event, newTheme) => {
      log.info(`IPC: Setting theme to ${newTheme}`);
      const result = deps.themeManager.setTheme(newTheme);
      
      if (result.success) {
        // Save theme to config
        const currentSettings = await deps.configManager.loadSettings();
        currentSettings.theme = newTheme;
        await deps.configManager.saveSettings(currentSettings);
      }
      
      return result;
    });

    // Settings handlers
    this.registerHandler('get-settings', async () => {
      try {
        const settings = await deps.configManager.loadSettings();
        return settings;
      } catch (error) {
        log.error('IPC: Failed to get settings:', error);
        return deps.configManager.getDefaultSettings();
      }
    });

    this.registerHandler('save-settings', async (event, settings) => {
      try {
        const result = await deps.configManager.saveSettings(settings);
        
        // If theme changed, update theme manager
        if (settings.theme && deps.themeManager.isValidTheme(settings.theme)) {
          deps.themeManager.setTheme(settings.theme);
        }
        
        return result;
      } catch (error) {
        log.error('IPC: Failed to save settings:', error);
        return { success: false, error: error.message };
      }
    });

    this.registerHandler('close-settings', () => {
      log.info('IPC: Closing settings window');
      deps.windowManager.closeSettingsWindow();
    });

    // App control handlers
    this.registerHandler('quit-app', () => {
      log.info('IPC: Quit app requested');
      if (deps.onQuit) {
        deps.onQuit();
      }
    });
  }

  /**
   * Register an IPC handler with error wrapping
   * @param {string} channel - IPC channel name
   * @param {Function} handler - Handler function
   * @private
   */
  registerHandler(channel, handler) {
    if (this.handlers.has(channel)) {
      log.warn(`IPC handler for '${channel}' already exists, overriding`);
    }

    const wrappedHandler = async (...args) => {
      try {
        return await handler(...args);
      } catch (error) {
        log.error(`IPC handler error for '${channel}':`, error);
        return {
          success: false,
          error: error.message || 'Unknown error',
          channel: channel
        };
      }
    };

    ipcMain.handle(channel, wrappedHandler);
    this.handlers.set(channel, wrappedHandler);
    
    log.debug(`IPC handler registered: ${channel}`);
  }

  /**
   * Unregister an IPC handler
   * @param {string} channel - IPC channel name
   */
  unregisterHandler(channel) {
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel);
      this.handlers.delete(channel);
      log.debug(`IPC handler unregistered: ${channel}`);
    }
  }

  /**
   * Get list of registered handlers
   * @returns {Array<string>} Array of channel names
   */
  getRegisteredHandlers() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if handler is registered
   * @param {string} channel - IPC channel name
   * @returns {boolean} Whether handler exists
   */
  hasHandler(channel) {
    return this.handlers.has(channel);
  }

  /**
   * Cleanup all IPC handlers
   */
  dispose() {
    // Remove all handlers
    for (const channel of this.handlers.keys()) {
      ipcMain.removeHandler(channel);
    }
    
    this.handlers.clear();
    this.isSetup = false;
    
    log.info('IPC handlers disposed');
  }
}

module.exports = IPCHandler;