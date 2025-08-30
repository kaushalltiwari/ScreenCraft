const { nativeTheme } = require('electron');
const log = require('electron-log');

/**
 * ThemeManager - Handles application theme management
 * Design Pattern: Observer pattern for theme updates
 */
class ThemeManager {
  constructor() {
    this.currentTheme = 'system';
    this.systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    this.windows = new Set(); // Track windows that need theme updates
    this.listeners = new Set(); // Theme change listeners
    
    this.initializeThemeSystem();
  }

  /**
   * Initialize theme system and listen for system changes
   */
  initializeThemeSystem() {
    // Listen for system theme changes
    nativeTheme.on('updated', () => {
      const newSystemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      this.systemTheme = newSystemTheme;
      log.info(`System theme changed to: ${newSystemTheme}`);
      
      // Notify listeners if using system theme
      if (this.currentTheme === 'system') {
        this.notifyThemeUpdate(newSystemTheme);
      }
    });
    
    log.info(`Theme system initialized - Current: ${this.currentTheme}, System: ${this.systemTheme}`);
  }

  /**
   * Set current theme
   * @param {string} theme - Theme to set ('light', 'dark', 'system')
   * @returns {{success: boolean, currentTheme: string, effectiveTheme: string, systemTheme: string}}
   */
  setTheme(theme) {
    if (!this.isValidTheme(theme)) {
      return { success: false, message: 'Invalid theme' };
    }

    this.currentTheme = theme;
    const effectiveTheme = this.getEffectiveTheme();
    
    // Notify all listeners
    this.notifyThemeUpdate(effectiveTheme);
    
    log.info(`Theme changed to: ${theme} (effective: ${effectiveTheme})`);
    
    return {
      success: true,
      currentTheme: this.currentTheme,
      effectiveTheme: effectiveTheme,
      systemTheme: this.systemTheme
    };
  }

  /**
   * Get current theme info
   * @returns {{currentTheme: string, effectiveTheme: string, systemTheme: string}}
   */
  getThemeInfo() {
    return {
      currentTheme: this.currentTheme,
      effectiveTheme: this.getEffectiveTheme(),
      systemTheme: this.systemTheme
    };
  }

  /**
   * Get effective theme (resolves 'system' to actual theme)
   * @returns {string} Effective theme ('light' or 'dark')
   */
  getEffectiveTheme() {
    return this.currentTheme === 'system' ? this.systemTheme : this.currentTheme;
  }

  /**
   * Add a window to receive theme updates
   * @param {BrowserWindow} window - Window to track
   */
  addWindow(window) {
    if (window && window.webContents) {
      this.windows.add(window);
      
      // Send current theme to the window
      this.sendThemeToWindow(window, this.getEffectiveTheme());
      
      // Remove window when closed
      window.on('closed', () => {
        this.windows.delete(window);
      });
    }
  }

  /**
   * Remove a window from theme updates
   * @param {BrowserWindow} window - Window to remove
   */
  removeWindow(window) {
    this.windows.delete(window);
  }

  /**
   * Add theme change listener
   * @param {Function} listener - Function to call on theme change
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
  }

  /**
   * Remove theme change listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of theme update
   * @param {string} effectiveTheme - The effective theme
   * @private
   */
  notifyThemeUpdate(effectiveTheme) {
    // Update all tracked windows
    this.windows.forEach(window => {
      this.sendThemeToWindow(window, effectiveTheme);
    });

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener({
          currentTheme: this.currentTheme,
          effectiveTheme: effectiveTheme,
          systemTheme: this.systemTheme
        });
      } catch (error) {
        log.error('Error in theme listener:', error);
      }
    });
  }

  /**
   * Send theme update to specific window
   * @param {BrowserWindow} window - Window to update
   * @param {string} effectiveTheme - The effective theme
   * @private
   */
  sendThemeToWindow(window, effectiveTheme) {
    if (window && !window.isDestroyed() && window.webContents) {
      window.webContents.send('theme-update', {
        currentTheme: this.currentTheme,
        effectiveTheme: effectiveTheme,
        systemTheme: this.systemTheme
      });
    }
  }

  /**
   * Validate theme value
   * @param {string} theme - Theme to validate
   * @returns {boolean} Whether theme is valid
   */
  isValidTheme(theme) {
    return ['light', 'dark', 'system'].includes(theme);
  }

  /**
   * Load theme from settings
   * @param {string} savedTheme - Theme from settings
   */
  loadTheme(savedTheme) {
    if (this.isValidTheme(savedTheme)) {
      this.currentTheme = savedTheme;
      log.info(`Loaded saved theme preference: ${this.currentTheme}`);
    } else {
      this.currentTheme = 'system';
      log.info('Invalid saved theme, using system theme');
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.windows.clear();
    this.listeners.clear();
    nativeTheme.removeAllListeners('updated');
  }
}

module.exports = ThemeManager;