const { BrowserWindow } = require('electron');
const path = require('path');
const log = require('electron-log');
const CONSTANTS = require('../shared/constants');

/**
 * WindowManager - Handles creation and management of all application windows
 * Design Pattern: Factory pattern for window creation
 */
class WindowManager {
  constructor() {
    this.previewWindows = new Map(); // Map of windowId -> {window, screenshotPath, screenshotId}
    this.settingsWindow = null;
    this.screenshotCounter = 0;
    this.appIcon = null;
  }

  /**
   * Set the app icon for all windows
   * @param {NativeImage} icon - App icon
   */
  setAppIcon(icon) {
    this.appIcon = icon;
  }

  /**
   * Create a preview window for screenshot
   * @param {Object} screenshotData - Screenshot data
   * @param {Function} onCloseCallback - Callback for window close
   * @returns {BrowserWindow} Created preview window
   */
  createPreviewWindow(screenshotData, onCloseCallback = null) {
    // Generate unique screenshot ID
    this.screenshotCounter++;
    const screenshotId = `screenshot-${this.screenshotCounter}`;
    
    // Create preview window similar to Snipping Tool
    const previewWindow = new BrowserWindow({
      width: Math.min(CONSTANTS.WINDOW.PREVIEW_MAX_WIDTH, screenshotData.dimensions.width + CONSTANTS.WINDOW.PREVIEW_WIDTH_PADDING),
      height: Math.min(CONSTANTS.WINDOW.PREVIEW_MAX_HEIGHT, screenshotData.dimensions.height + CONSTANTS.WINDOW.PREVIEW_HEIGHT_PADDING),
      show: false,
      frame: true,
      transparent: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
      maximizable: true,
      minimizable: true,
      title: `Screenshot Preview #${this.screenshotCounter}`,
      autoHideMenuBar: true,
      icon: this.appIcon,
      webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
        preload: path.join(__dirname, '..', 'renderer', 'preview-preload.js')
      }
    });

    // Store window reference with metadata
    const windowId = previewWindow.id;
    this.previewWindows.set(windowId, {
      window: previewWindow,
      screenshotPath: screenshotData.filePath,
      screenshotId: screenshotId
    });

    // Load preview HTML
    previewWindow.loadFile(path.join(__dirname, '..', 'renderer', 'preview.html'));

    // Handle window close
    previewWindow.on('close', () => {
      const windowData = this.previewWindows.get(windowId);
      if (windowData) {
        // Call external cleanup callback if provided
        if (onCloseCallback) {
          onCloseCallback(windowData);
        }
        this.previewWindows.delete(windowId);
      }
    });

    // Send screenshot data once window is ready
    previewWindow.webContents.once('dom-ready', () => {
      const enhancedScreenshotData = {
        ...screenshotData,
        screenshotId: screenshotId,
        windowId: windowId
      };
      
      previewWindow.webContents.send('screenshot-data', enhancedScreenshotData);
      previewWindow.show();
      previewWindow.focus();
    });

    log.info(`Preview window #${this.screenshotCounter} created with ID: ${windowId}`);
    return previewWindow;
  }

  /**
   * Create settings window
   * @param {Function} onSettingsDataCallback - Callback to get settings data
   * @returns {BrowserWindow} Settings window or existing window
   */
  createSettingsWindow(onSettingsDataCallback = null) {
    // Prevent multiple settings windows
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    // Create settings window
    this.settingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      frame: true,
      transparent: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      resizable: true,
      maximizable: false,
      minimizable: true,
      title: 'Settings - Screenshot Tool',
      autoHideMenuBar: true,
      icon: this.appIcon,
      webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
        preload: path.join(__dirname, '..', 'renderer', 'settings-preload.js')
      }
    });

    // Load settings HTML
    this.settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));

    // Show window when ready
    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow.show();
      
      // Send settings data if callback provided
      if (onSettingsDataCallback) {
        const settingsData = onSettingsDataCallback();
        this.settingsWindow.webContents.send('settings-data', settingsData);
      }
    });

    // Handle window closed
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    log.info('Settings window opened');
    return this.settingsWindow;
  }

  /**
   * Get preview window data by window ID
   * @param {number} windowId - Window ID
   * @returns {Object|null} Window data or null
   */
  getPreviewWindowData(windowId) {
    return this.previewWindows.get(windowId) || null;
  }

  /**
   * Update screenshot path for a preview window
   * @param {number} windowId - Window ID
   * @param {string|null} newPath - New screenshot path or null to clear
   */
  updatePreviewWindowPath(windowId, newPath) {
    const windowData = this.previewWindows.get(windowId);
    if (windowData) {
      windowData.screenshotPath = newPath;
    }
  }

  /**
   * Get information about all open preview windows
   * @returns {Array} Array of window information
   */
  getOpenWindowsInfo() {
    const windowsInfo = [];
    for (const [windowId, windowData] of this.previewWindows.entries()) {
      windowsInfo.push({
        windowId: windowId,
        screenshotId: windowData.screenshotId,
        title: windowData.window.getTitle()
      });
    }
    return windowsInfo;
  }

  /**
   * Close preview window by ID
   * @param {number} windowId - Window ID to close
   * @returns {boolean} Whether window was found and closed
   */
  closePreviewWindow(windowId) {
    const windowData = this.previewWindows.get(windowId);
    if (windowData && !windowData.window.isDestroyed()) {
      windowData.window.close();
      return true;
    }
    return false;
  }

  /**
   * Close settings window if open
   */
  closeSettingsWindow() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
    }
  }

  /**
   * Send message to all preview windows
   * @param {string} channel - IPC channel
   * @param {any} data - Data to send
   */
  broadcastToPreviewWindows(channel, data) {
    for (const [windowId, windowData] of this.previewWindows.entries()) {
      if (!windowData.window.isDestroyed()) {
        windowData.window.webContents.send(channel, data);
      }
    }
  }

  /**
   * Get current preview window count
   * @returns {number} Number of open preview windows
   */
  getPreviewWindowCount() {
    return this.previewWindows.size;
  }

  /**
   * Check if settings window is open
   * @returns {boolean} Whether settings window is open
   */
  isSettingsWindowOpen() {
    return this.settingsWindow && !this.settingsWindow.isDestroyed();
  }

  /**
   * Cleanup all windows and resources
   * @param {Function} cleanupCallback - Callback for cleaning up window data
   */
  async cleanup(cleanupCallback = null) {
    // Close all preview windows
    for (const [windowId, windowData] of this.previewWindows.entries()) {
      if (cleanupCallback) {
        await cleanupCallback(windowData);
      }
      
      if (!windowData.window.isDestroyed()) {
        windowData.window.close();
      }
    }
    this.previewWindows.clear();
    
    // Close settings window
    this.closeSettingsWindow();
    
    log.info('Window manager cleaned up');
  }
}

module.exports = WindowManager;