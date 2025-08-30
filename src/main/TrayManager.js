const { Tray, Menu, app } = require('electron');
const log = require('electron-log');

/**
 * TrayManager - Handles system tray functionality
 * Design Pattern: Facade pattern for tray operations
 */
class TrayManager {
  constructor() {
    this.tray = null;
    this.appIcon = null;
    this.onScreenshotCallback = null;
    this.onSettingsCallback = null;
    this.onQuitCallback = null;
  }

  /**
   * Initialize tray with icon and callbacks
   * @param {NativeImage} appIcon - App icon
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onScreenshot - Screenshot trigger callback
   * @param {Function} callbacks.onSettings - Settings open callback
   * @param {Function} callbacks.onQuit - Quit application callback
   */
  initialize(appIcon, callbacks = {}) {
    this.appIcon = appIcon;
    this.onScreenshotCallback = callbacks.onScreenshot;
    this.onSettingsCallback = callbacks.onSettings;
    this.onQuitCallback = callbacks.onQuit;
    
    this.setupTray();
  }

  /**
   * Setup system tray
   * @private
   */
  setupTray() {
    if (!this.appIcon) {
      log.error('Cannot setup tray without app icon');
      return;
    }

    // Create tray icon using global app icon
    this.tray = new Tray(this.appIcon);
    
    this.tray.setToolTip('Offline Screenshot Tool');
    
    // Create context menu
    this.updateContextMenu();

    // Single click to trigger screenshot
    this.tray.on('click', () => {
      this.triggerScreenshot();
    });

    log.info('System tray setup complete');
  }

  /**
   * Update context menu
   * @private
   */
  updateContextMenu() {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Take Screenshot (Ctrl+Shift+S)',
        click: () => this.triggerScreenshot()
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.openSettings()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => this.quitApplication()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Trigger screenshot capture
   * @private
   */
  triggerScreenshot() {
    log.info('Tray: Screenshot triggered');
    if (this.onScreenshotCallback) {
      this.onScreenshotCallback();
    }
  }

  /**
   * Open settings window
   * @private
   */
  openSettings() {
    log.info('Tray: Settings requested');
    if (this.onSettingsCallback) {
      this.onSettingsCallback();
    }
  }

  /**
   * Quit application
   * @private
   */
  quitApplication() {
    log.info('Tray: Quit requested');
    if (this.onQuitCallback) {
      this.onQuitCallback();
    } else {
      // Default quit behavior
      app.quit();
    }
  }

  /**
   * Update tray tooltip
   * @param {string} tooltip - New tooltip text
   */
  setTooltip(tooltip) {
    if (this.tray) {
      this.tray.setToolTip(tooltip);
    }
  }

  /**
   * Update tray icon
   * @param {NativeImage} icon - New icon
   */
  setIcon(icon) {
    if (this.tray) {
      this.tray.setImage(icon);
      this.appIcon = icon;
    }
  }

  /**
   * Add custom menu item
   * @param {Object} menuItem - Menu item configuration
   * @param {number} position - Position to insert (optional)
   */
  addMenuItem(menuItem, position = -1) {
    // This would require rebuilding the context menu
    // For now, we'll keep it simple and just log
    log.info('Tray: Custom menu item requested', menuItem);
    // TODO: Implement dynamic menu item addition if needed
  }

  /**
   * Show balloon notification (Windows only)
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   */
  displayBalloon(title, content) {
    if (this.tray && process.platform === 'win32') {
      this.tray.displayBalloon({
        title: title,
        content: content,
        icon: this.appIcon
      });
    }
  }

  /**
   * Check if tray is supported
   * @returns {boolean} Whether tray is supported
   */
  isSupported() {
    return Tray.isSupported();
  }

  /**
   * Get tray bounds (for positioning windows)
   * @returns {Object|null} Tray bounds or null
   */
  getBounds() {
    return this.tray ? this.tray.getBounds() : null;
  }

  /**
   * Cleanup tray resources
   */
  dispose() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    // Clear callbacks
    this.onScreenshotCallback = null;
    this.onSettingsCallback = null;
    this.onQuitCallback = null;
    
    log.info('Tray manager disposed');
  }
}

module.exports = TrayManager;