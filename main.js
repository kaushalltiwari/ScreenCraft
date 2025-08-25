const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');

// Import modular components
const ScreenCaptureManager = require('./src/main/ScreenCaptureManager');
const FileManager = require('./src/main/FileManager');
const CONSTANTS = require('./src/shared/constants');

// Configure logging for offline-only operation
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

class ScreenCaptureApp {
  constructor() {
    this.tray = null;
    this.previewWindows = new Map(); // Map of windowId -> {window, screenshotPath, screenshotId}
    this.settingsWindow = null;
    this.isQuitting = false;
    this.screenshotCounter = 0;
    this.appIcon = null; // Global app icon
    
    // Theme management
    this.currentTheme = 'system'; // 'light', 'dark', 'system'
    this.systemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    this.settingsFile = path.join(app.getPath('userData'), 'app-settings.json');
    
    // Initialize modular components
    this.screenCaptureManager = new ScreenCaptureManager();
    this.fileManager = new FileManager();
  }

  initialize() {
    // Ensure single instance
    const gotTheLock = app.requestSingleInstanceLock();
    
    if (!gotTheLock) {
      log.info('Another instance is already running, quitting...');
      // Force quit without cleanup to avoid errors
      process.exit(0);
      return;
    }

    // Handle second instance attempt
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      log.info('Second instance attempt blocked, focusing tray');
      // Could trigger screenshot if second instance tries to start
    });

    // App event handlers
    app.whenReady().then(() => this.onReady());
    app.on('window-all-closed', this.onWindowAllClosed.bind(this));
    app.on('activate', this.onActivate.bind(this));
    app.on('before-quit', () => { this.isQuitting = true; });
  }

  async onReady() {
    log.info('App is ready, initializing screenshot tool...');
    
    try {
      // Initialize app icon first
      this.initializeAppIcon();
      
      // Initialize components
      await this.screenCaptureManager.initialize();
      await this.fileManager.initialize();
      
      // Pass app icon to screen capture manager
      this.screenCaptureManager.setAppIcon(this.appIcon);
      
      // Load saved settings and initialize theme system
      await this.loadSettings();
      this.initializeThemeSystem();
      
      // Only setup tray and shortcuts - no main window
      this.setupTray();
      this.registerGlobalShortcuts();
      this.setupIPC();
      
      log.info('Screenshot tool initialized successfully');
    } catch (error) {
      log.error('Failed to initialize screenshot tool:', error);
    }
  }

  initializeAppIcon() {
    // Try to load abstract SVG icon first, then PNG, then fallback to generated
    const { nativeImage } = require('electron');
    const svgIconPath = path.join(__dirname, 'assets', 'icon-abstract.svg');
    const pngIconPath = path.join(__dirname, 'assets', 'icon.png');
    
    try {
      // Check if abstract SVG icon exists
      if (require('fs').existsSync(svgIconPath)) {
        this.appIcon = nativeImage.createFromPath(svgIconPath);
        log.info('Using abstract SVG icon from assets/icon-abstract.svg');
      } else if (require('fs').existsSync(pngIconPath)) {
        // Fallback to PNG if SVG not available
        this.appIcon = nativeImage.createFromPath(pngIconPath);
        log.info('Using custom PNG icon from assets/icon.png');
      } else {
        // Use generated default icon as final fallback
        this.appIcon = this.createDefaultIcon();
        log.info('Using generated default icon');
      }
    } catch (error) {
      log.warn('Failed to load custom icons, using generated default:', error);
      this.appIcon = this.createDefaultIcon();
    }
  }

  initializeThemeSystem() {
    // Listen for system theme changes
    nativeTheme.on('updated', () => {
      const newSystemTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      this.systemTheme = newSystemTheme;
      log.info(`System theme changed to: ${newSystemTheme}`);
      
      // Update all open windows if using system theme
      if (this.currentTheme === 'system') {
        this.updateAllWindowsTheme(newSystemTheme);
      }
    });
    
    log.info(`Theme system initialized - Current: ${this.currentTheme}, System: ${this.systemTheme}`);
  }

  updateAllWindowsTheme(theme) {
    this.previewWindows.forEach((windowData, windowId) => {
      windowData.window.webContents.send('theme-update', {
        currentTheme: this.currentTheme,
        effectiveTheme: theme,
        systemTheme: this.systemTheme
      });
    });
  }

  getEffectiveTheme() {
    return this.currentTheme === 'system' ? this.systemTheme : this.currentTheme;
  }

  async loadSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      
      if (settings.theme && ['light', 'dark', 'system'].includes(settings.theme)) {
        this.currentTheme = settings.theme;
        log.info(`Loaded saved theme preference: ${this.currentTheme}`);
      }
    } catch (error) {
      // Settings file doesn't exist or is corrupted, use defaults
      log.info('No saved settings found, using defaults');
      this.currentTheme = 'system';
    }
  }

  async saveSettings(customSettings = null) {
    try {
      const settings = customSettings || {
        theme: this.currentTheme,
        shortcuts: {},
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };
      
      // If custom settings provided, merge with current theme
      if (customSettings) {
        settings.theme = customSettings.theme || this.currentTheme;
        settings.shortcuts = customSettings.shortcuts || {};
        settings.version = '1.0.0';
        settings.lastUpdated = new Date().toISOString();
      }
      
      // Ensure the userData directory exists
      const userDataDir = app.getPath('userData');
      await fs.mkdir(userDataDir, { recursive: true });
      
      await fs.writeFile(this.settingsFile, JSON.stringify(settings, null, 2));
      log.info(`Settings saved: theme = ${settings.theme}, shortcuts = ${Object.keys(settings.shortcuts).length} items`);
      
      return { success: true };
    } catch (error) {
      log.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      return {
        theme: settings.theme || 'system',
        shortcuts: settings.shortcuts || {},
        version: settings.version || '1.0.0'
      };
    } catch (error) {
      log.info('No saved settings found, returning defaults');
      return {
        theme: 'system',
        shortcuts: {},
        version: '1.0.0'
      };
    }
  }

  createPreviewWindow(screenshotData) {
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
        preload: path.join(__dirname, 'src', 'renderer', 'preview-preload.js')
      }
    });

    // Store window reference with metadata
    const windowId = previewWindow.id;
    this.previewWindows.set(windowId, {
      window: previewWindow,
      screenshotPath: screenshotData.filePath,
      screenshotId: screenshotId
    });

    previewWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'preview.html'));

    // Handle window close - automatically clean up temporary file
    previewWindow.on('close', async () => {
      const windowData = this.previewWindows.get(windowId);
      if (windowData && windowData.screenshotPath) {
        try {
          await this.fileManager.deleteFile(windowData.screenshotPath);
          log.info(`Temporary screenshot file automatically cleaned up for window #${this.screenshotCounter}`);
        } catch (error) {
          log.warn('Failed to clean up temporary screenshot file:', error.message);
        }
      }
      this.previewWindows.delete(windowId);
    });

    // Send screenshot data once window is ready
    previewWindow.webContents.once('dom-ready', () => {
      const enhancedScreenshotData = {
        ...screenshotData,
        screenshotId: screenshotId,
        windowId: windowId
      };
      
      // Send initial theme data
      previewWindow.webContents.send('theme-update', {
        currentTheme: this.currentTheme,
        effectiveTheme: this.getEffectiveTheme(),
        systemTheme: this.systemTheme
      });
      
      previewWindow.webContents.send('screenshot-data', enhancedScreenshotData);
      previewWindow.show();
      previewWindow.focus();
    });

    log.info(`Preview window #${this.screenshotCounter} created with ID: ${windowId}`);
    return previewWindow;
  }

  setupTray() {
    // Create tray icon using global app icon
    this.tray = new Tray(this.appIcon);
    
    this.tray.setToolTip('Offline Screenshot Tool');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Take Screenshot (Ctrl+Shift+S)',
        click: () => this.triggerScreenshot()
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.openSettingsWindow()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    
    // Single click to trigger screenshot
    this.tray.on('click', () => {
      this.triggerScreenshot();
    });

    log.info('System tray setup complete');
  }

  createDefaultIcon() {
    // Create a minimalist screenshot icon programmatically
    const { nativeImage } = require('electron');
    
    const size = 32; // Increased size for better quality
    const buffer = Buffer.alloc(size * size * 4); // RGBA
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 2;
    
    // Helper function to set pixel
    function setPixel(x, y, r, g, b, a = 255) {
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      const index = (y * size + x) * 4;
      buffer[index] = r;
      buffer[index + 1] = g;
      buffer[index + 2] = b;
      buffer[index + 3] = a;
    }
    
    // Draw background circle with modern gradient
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          // Modern gradient: Purple to Blue
          const gradient = 1 - (distance / radius);
          const r = Math.floor(102 * gradient + 118 * (1 - gradient));
          const g = Math.floor(126 * gradient + 75 * (1 - gradient));
          const b = Math.floor(234 * gradient + 162 * (1 - gradient));
          setPixel(x, y, r, g, b);
        } else if (distance <= radius + 1) {
          // Border
          setPixel(x, y, 67, 56, 202);
        }
      }
    }
    
    // Draw minimalist screen rectangle
    const screenW = size * 0.5;
    const screenH = size * 0.375;
    const screenX = centerX - screenW / 2;
    const screenY = centerY - screenH / 2;
    
    // Screen background
    for (let y = screenY; y < screenY + screenH; y++) {
      for (let x = screenX; x < screenX + screenW; x++) {
        setPixel(Math.floor(x), Math.floor(y), 248, 250, 252);
      }
    }
    
    // Screen border
    for (let x = screenX - 1; x < screenX + screenW + 1; x++) {
      setPixel(Math.floor(x), Math.floor(screenY - 1), 51, 65, 85);
      setPixel(Math.floor(x), Math.floor(screenY + screenH), 51, 65, 85);
    }
    for (let y = screenY - 1; y < screenY + screenH + 1; y++) {
      setPixel(Math.floor(screenX - 1), Math.floor(y), 51, 65, 85);
      setPixel(Math.floor(screenX + screenW), Math.floor(y), 51, 65, 85);
    }
    
    // Selection area indicators (corner dots)
    const selW = screenW * 0.75;
    const selH = screenH * 0.67;
    const selX = screenX + (screenW - selW) / 2;
    const selY = screenY + (screenH - selH) / 2;
    
    // Corner handles
    [[selX, selY], [selX + selW, selY], [selX, selY + selH], [selX + selW, selY + selH]].forEach(([x, y]) => {
      setPixel(Math.floor(x), Math.floor(y), 99, 102, 241);
      // Make handles slightly bigger for visibility
      setPixel(Math.floor(x + 1), Math.floor(y), 99, 102, 241);
      setPixel(Math.floor(x), Math.floor(y + 1), 99, 102, 241);
    });
    
    // Center capture indicator
    setPixel(Math.floor(centerX), Math.floor(centerY), 99, 102, 241);
    setPixel(Math.floor(centerX + 1), Math.floor(centerY), 99, 102, 241);
    setPixel(Math.floor(centerX), Math.floor(centerY + 1), 99, 102, 241);
    setPixel(Math.floor(centerX - 1), Math.floor(centerY), 99, 102, 241);
    setPixel(Math.floor(centerX), Math.floor(centerY - 1), 99, 102, 241);
    
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  registerGlobalShortcuts() {
    // Register Ctrl+Shift+S for screenshot
    const screenshotShortcut = globalShortcut.register('CommandOrControl+Shift+S', () => {
      log.info('Screenshot hotkey triggered');
      this.triggerScreenshot();
    });

    if (!screenshotShortcut) {
      log.error('Failed to register screenshot global shortcut');
    } else {
      log.info('Global shortcut Ctrl+Shift+S registered successfully');
    }

    // Future: Register Ctrl+Shift+F for fullscreen (Stage 2)
    // Future: Register Ctrl+Shift+R for recording (Stage 3)
  }

  setupIPC() {
    // Handle screenshot request from renderer
    ipcMain.handle('trigger-screenshot', async () => {
      return await this.handleScreenshotCapture();
    });

    // Handle selection processing from overlay
    ipcMain.handle('process-selection', async (event, selectionData) => {
      return await this.handleSelectionProcessing(selectionData);
    });

    // Handle overlay close
    ipcMain.handle('close-overlay', () => {
      this.screenCaptureManager.cancelCapture();
    });

    // Handle preview window actions
    ipcMain.handle('preview-action', async (event, actionData) => {
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
      return await this.handlePreviewAction(actionData, windowId);
    });

    // Handle preview window close
    ipcMain.handle('close-preview', (event) => {
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
      if (windowId && this.previewWindows.has(windowId)) {
        const windowData = this.previewWindows.get(windowId);
        windowData.window.close();
      }
    });


    // Handle app quit request
    ipcMain.handle('quit-app', () => {
      this.isQuitting = true;
      app.quit();
    });

    // Handle get open windows info
    ipcMain.handle('get-open-windows', () => {
      const windowsInfo = [];
      for (const [windowId, windowData] of this.previewWindows.entries()) {
        windowsInfo.push({
          windowId: windowId,
          screenshotId: windowData.screenshotId,
          title: windowData.window.getTitle()
        });
      }
      return windowsInfo;
    });

    // Handle theme operations
    ipcMain.handle('get-theme-info', () => {
      return {
        currentTheme: this.currentTheme,
        effectiveTheme: this.getEffectiveTheme(),
        systemTheme: this.systemTheme
      };
    });

    ipcMain.handle('set-theme', async (event, newTheme) => {
      if (['light', 'dark', 'system'].includes(newTheme)) {
        this.currentTheme = newTheme;
        const effectiveTheme = this.getEffectiveTheme();
        
        // Save settings to persist theme choice
        await this.saveSettings();
        
        // Update all windows
        this.updateAllWindowsTheme(effectiveTheme);
        
        log.info(`Theme changed to: ${newTheme} (effective: ${effectiveTheme})`);
        return {
          success: true,
          currentTheme: this.currentTheme,
          effectiveTheme: effectiveTheme,
          systemTheme: this.systemTheme
        };
      }
      return { success: false, message: 'Invalid theme' };
    });

    // Handle settings operations
    ipcMain.handle('get-settings', async () => {
      try {
        const settings = await this.getAllSettings();
        return settings;
      } catch (error) {
        log.error('Failed to get settings:', error);
        return { theme: 'system', shortcuts: {}, version: '1.0.0' };
      }
    });

    ipcMain.handle('save-settings', async (event, settings) => {
      try {
        const result = await this.saveSettings(settings);
        
        // If theme changed, update it
        if (settings.theme && settings.theme !== this.currentTheme) {
          this.currentTheme = settings.theme;
          const effectiveTheme = this.getEffectiveTheme();
          this.updateAllWindowsTheme(effectiveTheme);
          log.info(`Theme updated via settings: ${settings.theme} (effective: ${effectiveTheme})`);
        }
        
        return result;
      } catch (error) {
        log.error('Failed to save settings:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle closing settings window
    ipcMain.handle('close-settings', () => {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.close();
      }
    });

    log.info('IPC handlers setup complete');
  }

  async triggerScreenshot() {
    log.info('Screenshot triggered - starting capture process');
    
    try {
      // Don't close existing preview windows - allow multiple screenshots
      
      // Start screen capture with overlay
      const success = await this.screenCaptureManager.startCapture();
      
      if (success) {
        log.info('Screenshot overlay displayed successfully');
      } else {
        log.error('Failed to start screenshot capture');
        return { success: false, message: 'Failed to start capture' };
      }
      
      return { success: true, message: 'Capture started' };
    } catch (error) {
      log.error('Screenshot trigger failed:', error);
      return { success: false, message: error.message };
    }
  }

  async handleScreenshotCapture() {
    // Wrapper for backward compatibility
    return await this.triggerScreenshot();
  }

  async handleSelectionProcessing(selectionData) {
    try {
      log.info('Processing selection for preview');
      
      // Process the selection using ScreenCaptureManager
      const captureResult = await this.screenCaptureManager.processSelection(selectionData);
      
      if (!captureResult.success) {
        throw new Error('Failed to process screen selection');
      }

      // Process the captured image using FileManager  
      const fileResult = await this.fileManager.processScreenshot(captureResult);
      
      if (!fileResult.success) {
        throw new Error('Failed to process screenshot file');
      }

      // Create and show preview window with screenshot data
      const screenshotData = {
        filePath: fileResult.filePath,
        filename: fileResult.filename,
        fileSize: fileResult.fileSize,
        dimensions: fileResult.dimensions,
        timestamp: fileResult.timestamp
      };

      this.createPreviewWindow(screenshotData);

      return { 
        success: true, 
        message: 'Screenshot ready for preview'
      };

    } catch (error) {
      log.error('Selection processing failed:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to process selection' 
      };
    }
  }

  // New handlers for preview window actions
  async handlePreviewAction(actionData, windowId) {
    try {
      const { action, filePath, borders } = actionData;
      const windowData = this.previewWindows.get(windowId);
      
      switch (action) {
        case 'copy-image':
          if (borders) {
            // Copy image with borders applied
            await this.fileManager.copyImageWithBorders(borders);
            log.info('Screenshot with borders copied to clipboard');
            return { success: true, message: 'Screenshot with borders copied to clipboard' };
          } else {
            // Re-copy original image to clipboard
            const imageBuffer = await require('fs').promises.readFile(filePath);
            await this.fileManager.copyImageToClipboard(imageBuffer);
            log.info('Screenshot copied to clipboard');
            return { success: true, message: 'Screenshot copied to clipboard' };
          }

        case 'copy-path':
          // Copy file path to clipboard for Claude Code integration
          await this.fileManager.copyPathToClipboard(filePath);
          log.info('File path copied to clipboard');
          return { success: true, message: 'File path copied to clipboard' };

        case 'save':
          // Save to permanent location
          let saveResult;
          if (borders) {
            saveResult = await this.fileManager.saveImageWithBorders(borders, filePath);
            log.info('Screenshot with borders saved');
          } else {
            saveResult = await this.fileManager.saveToLocation(filePath);
            log.info('Original screenshot saved');
          }
          
          if (saveResult.success) {
            // Clear screenshot path from window data since it's now saved permanently
            if (windowData && windowData.screenshotPath === filePath) {
              windowData.screenshotPath = null;
            }
            log.info(`Screenshot saved permanently for window ${windowId}`);
            return { 
              success: true, 
              message: borders ? 'Screenshot with borders saved successfully' : 'Screenshot saved successfully',
              savedPath: saveResult.filePath
            };
          } else {
            throw new Error('Failed to save screenshot');
          }


        default:
          throw new Error('Unknown action: ' + action);
      }

    } catch (error) {
      log.error('Preview action failed:', error);
      return { 
        success: false, 
        message: error.message || 'Action failed' 
      };
    }
  }

  openSettingsWindow() {
    // Prevent multiple settings windows
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.focus();
      return;
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
        preload: path.join(__dirname, 'src', 'renderer', 'settings-preload.js')
      }
    });

    // Load settings HTML
    this.settingsWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'settings.html'));

    // Show window when ready
    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow.show();
      
      // Send current settings to window
      this.settingsWindow.webContents.send('settings-data', {
        theme: this.currentTheme,
        systemTheme: this.systemTheme,
        settings: {}
      });
    });

    // Handle window closed
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    log.info('Settings window opened');
  }

  onWindowAllClosed() {
    // Keep app running in background - only quit when explicitly requested
    // This allows the app to run purely through system tray
    log.info('All windows closed, app continues in tray');
  }

  onActivate() {
    // On macOS, don't recreate windows - app runs in tray only
    log.info('App activated, running in tray mode');
  }
}

// Initialize the app
const screenshotApp = new ScreenCaptureApp();

// Handle app termination
app.on('will-quit', async () => {
  try {
    // Cleanup components
    if (screenshotApp) {
      // Clean up all preview windows and their temporary files
      for (const [windowId, windowData] of screenshotApp.previewWindows.entries()) {
        if (windowData.screenshotPath) {
          try {
            await screenshotApp.fileManager.deleteFile(windowData.screenshotPath);
            log.info(`Cleaned up temporary file for window ${windowId}`);
          } catch (error) {
            log.warn(`Failed to clean up temporary file for window ${windowId}:`, error.message);
          }
        }
      }
      screenshotApp.previewWindows.clear();
      
      if (screenshotApp.screenCaptureManager) {
        screenshotApp.screenCaptureManager.dispose();
      }
      if (screenshotApp.fileManager) {
        await screenshotApp.fileManager.cleanup();
      }
    }
    
    // Unregister all global shortcuts only if app is ready
    if (app.isReady()) {
      globalShortcut.unregisterAll();
    }
    
    log.info('App shutting down, components and multiple windows cleaned up');
  } catch (error) {
    log.error('Error during app shutdown:', error);
  }
});

// Start the application
screenshotApp.initialize();

// Export for testing purposes
module.exports = ScreenCaptureApp;