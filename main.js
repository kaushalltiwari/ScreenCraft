const { app, globalShortcut } = require('electron');
const path = require('path');
const log = require('electron-log');

// Import modular components
const ScreenCaptureManager = require('./src/main/ScreenCaptureManager');
const FileManager = require('./src/main/FileManager');
const ConfigManager = require('./src/main/ConfigManager');
const ThemeManager = require('./src/main/ThemeManager');
const WindowManager = require('./src/main/WindowManager');
const TrayManager = require('./src/main/TrayManager');
const IPCHandler = require('./src/main/IPCHandler');
const ValidationUtils = require('./src/shared/ValidationUtils');
const ErrorHandler = require('./src/shared/ErrorHandler');
const CONSTANTS = require('./src/shared/constants');

// Configure logging for offline-only operation
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

class ScreenCaptureApp {
  constructor() {
    this.isQuitting = false;
    this.appIcon = null;
    
    // Initialize all manager components
    this.screenCaptureManager = new ScreenCaptureManager();
    this.fileManager = new FileManager();
    this.configManager = new ConfigManager();
    this.themeManager = new ThemeManager();
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager();
    this.ipcHandler = new IPCHandler();
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
      
      // Initialize core managers
      await this.screenCaptureManager.initialize();
      await this.fileManager.initialize();
      
      // Set app icons for components that need them
      this.screenCaptureManager.setAppIcon(this.appIcon);
      this.windowManager.setAppIcon(this.appIcon);
      
      // Load settings and initialize theme
      const settings = await this.configManager.loadSettings();
      this.themeManager.loadTheme(settings.theme);
      
      // Setup tray with callbacks
      this.trayManager.initialize(this.appIcon, {
        onScreenshot: () => this.triggerScreenshot(),
        onSettings: () => this.openSettingsWindow(),
        onQuit: () => this.quitApp()
      });
      
      // Setup IPC handlers
      this.setupIPC();
      
      // Register global shortcuts
      this.registerGlobalShortcuts();
      
      log.info('Screenshot tool initialized successfully');
    } catch (error) {
      log.error('Failed to initialize screenshot tool:', error);
    }
  }

  initializeAppIcon() {
    // Use generated abstract icon design - SVGs don't work well for system icons
    const { nativeImage } = require('electron');
    const pngIconPath = path.join(__dirname, 'assets', 'icon.png');
    
    try {
      // Check if custom PNG icon exists first
      if (require('fs').existsSync(pngIconPath)) {
        this.appIcon = nativeImage.createFromPath(pngIconPath);
        log.info('Using custom PNG icon from assets/icon.png');
      } else {
        // Use generated abstract icon design
        this.appIcon = this.createAbstractIcon();
        log.info('Using generated abstract icon design');
      }
    } catch (error) {
      log.warn('Failed to load custom icon, using generated abstract:', error);
      this.appIcon = this.createAbstractIcon();
    }
  }

  // Removed deprecated methods - now handled by manager classes

  createPreviewWindow(screenshotData) {
    // Create preview window using WindowManager
    const previewWindow = this.windowManager.createPreviewWindow(
      screenshotData,
      async (windowData) => {
        // Cleanup callback for when window closes
        if (windowData && windowData.screenshotPath) {
          try {
            await this.fileManager.deleteFile(windowData.screenshotPath);
            log.info('Temporary screenshot file automatically cleaned up');
          } catch (error) {
            log.warn('Failed to clean up temporary screenshot file:', error.message);
          }
        }
      }
    );

    // Add window to theme manager for theme updates
    this.themeManager.addWindow(previewWindow);

    return previewWindow;
  }

  // setupTray method removed - now handled by TrayManager

  createAbstractIcon() {
    // Create abstract capture icon with vibrant gradient
    const { nativeImage } = require('electron');
    
    const size = 32; // Good size for system tray
    const buffer = Buffer.alloc(size * size * 4); // RGBA
    
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Helper function to set pixel
    function setPixel(x, y, r, g, b, a = 255) {
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      const index = (y * size + x) * 4;
      buffer[index] = r;
      buffer[index + 1] = g;
      buffer[index + 2] = b;
      buffer[index + 3] = a;
    }
    
    // Create vibrant diagonal gradient background (Purple to Pink)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gradientPos = (x + y) / (size * 2);
        const r = Math.floor(99 + (236 - 99) * gradientPos);   // #6366f1 to #ec4899
        const g = Math.floor(102 + (72 - 102) * gradientPos);
        const b = Math.floor(241 + (153 - 241) * gradientPos);
        setPixel(x, y, r, g, b);
      }
    }
    
    // Add radial glow effect
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = size * 0.4;
        
        if (distance <= maxDistance) {
          const glowIntensity = 1 - (distance / maxDistance);
          const glowAmount = Math.floor(30 * glowIntensity * 0.3);
          
          const currentIndex = (y * size + x) * 4;
          const currentR = buffer[currentIndex];
          const currentG = buffer[currentIndex + 1];
          const currentB = buffer[currentIndex + 2];
          
          setPixel(x, y,
            Math.min(255, currentR + glowAmount),
            Math.min(255, currentG + glowAmount),
            Math.min(255, currentB + glowAmount)
          );
        }
      }
    }
    
    // Draw main capture frame (white outline)
    const frameSize = size * 0.6;
    const frameX = Math.floor(centerX - frameSize / 2);
    const frameY = Math.floor(centerY - frameSize / 2);
    const frameEndX = Math.floor(centerX + frameSize / 2);
    const frameEndY = Math.floor(centerY + frameSize / 2);
    
    // Draw frame outline
    for (let x = frameX; x <= frameEndX; x++) {
      setPixel(x, frameY, 255, 255, 255, 230);     // Top
      setPixel(x, frameEndY, 255, 255, 255, 230);  // Bottom
    }
    for (let y = frameY; y <= frameEndY; y++) {
      setPixel(frameX, y, 255, 255, 255, 230);     // Left
      setPixel(frameEndX, y, 255, 255, 255, 230);  // Right
    }
    
    // Draw dynamic corner elements (L-shaped brackets)
    const cornerSize = 4;
    const corners = [
      { x: frameX - 2, y: frameY - 2 }, // Top-left
      { x: frameEndX - cornerSize + 2, y: frameY - 2 }, // Top-right
      { x: frameX - 2, y: frameEndY - cornerSize + 2 }, // Bottom-left
      { x: frameEndX - cornerSize + 2, y: frameEndY - cornerSize + 2 } // Bottom-right
    ];
    
    corners.forEach((corner, index) => {
      const isLeft = index % 2 === 0;
      const isTop = index < 2;
      
      // Draw L-shaped brackets
      for (let i = 0; i < cornerSize; i++) {
        if (isLeft && isTop) {
          setPixel(corner.x + i, corner.y, 255, 255, 255);     // Horizontal
          setPixel(corner.x, corner.y + i, 255, 255, 255);     // Vertical
        } else if (!isLeft && isTop) {
          setPixel(corner.x + i, corner.y, 255, 255, 255);     // Horizontal
          setPixel(corner.x + cornerSize - 1, corner.y + i, 255, 255, 255); // Vertical
        } else if (isLeft && !isTop) {
          setPixel(corner.x, corner.y + i, 255, 255, 255);     // Vertical
          setPixel(corner.x + i, corner.y + cornerSize - 1, 255, 255, 255); // Horizontal
        } else {
          setPixel(corner.x + cornerSize - 1, corner.y + i, 255, 255, 255); // Vertical
          setPixel(corner.x + i, corner.y + cornerSize - 1, 255, 255, 255); // Horizontal
        }
      }
    });
    
    // Draw center capture indicator
    setPixel(Math.floor(centerX), Math.floor(centerY), 255, 255, 255);
    setPixel(Math.floor(centerX + 1), Math.floor(centerY), 255, 255, 255);
    setPixel(Math.floor(centerX), Math.floor(centerY + 1), 255, 255, 255);
    setPixel(Math.floor(centerX - 1), Math.floor(centerY), 255, 255, 255);
    setPixel(Math.floor(centerX), Math.floor(centerY - 1), 255, 255, 255);
    
    // Add small crosshair in center
    setPixel(Math.floor(centerX + 2), Math.floor(centerY), 255, 255, 255, 180);
    setPixel(Math.floor(centerX - 2), Math.floor(centerY), 255, 255, 255, 180);
    setPixel(Math.floor(centerX), Math.floor(centerY + 2), 255, 255, 255, 180);
    setPixel(Math.floor(centerX), Math.floor(centerY - 2), 255, 255, 255, 180);
    
    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  // Keep the old method as backup
  createDefaultIcon() {
    return this.createAbstractIcon();
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
    // Initialize IPC handler with all dependencies
    this.ipcHandler.initialize({
      screenCaptureManager: this.screenCaptureManager,
      configManager: this.configManager,
      themeManager: this.themeManager,
      windowManager: this.windowManager,
      onPreviewAction: (actionData, windowId) => this.handlePreviewAction(actionData, windowId),
      onQuit: () => this.quitApp()
    });

    // Register custom handler for selection processing (needs main app context)
    const { ipcMain } = require('electron');
    ipcMain.handle('process-selection', async (event, selectionData) => {
      return await this.handleSelectionProcessing(selectionData);
    });
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
    return ErrorHandler.withErrorHandling(async () => {
      log.info('Processing selection for preview');
      
      // Validate selection data first
      const validation = ValidationUtils.validateSelectionData(selectionData);
      if (!validation.isValid) {
        throw new Error(`Invalid selection data: ${validation.errors.join(', ')}`);
      }
      
      // Process the selection using ScreenCaptureManager
      const captureResult = await this.screenCaptureManager.processSelection(validation.sanitized);
      
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

      return ErrorHandler.createSuccessResponse('Screenshot ready for preview', 'handleSelectionProcessing');
    }, 'handleSelectionProcessing', ErrorHandler.handleScreenCaptureError);
  }

  async handlePreviewAction(actionData, windowId) {
    return ErrorHandler.withErrorHandling(async () => {
      // Validate inputs
      const actionValidation = ValidationUtils.validatePreviewActionData(actionData);
      if (!actionValidation.isValid) {
        throw new Error(`Invalid action data: ${actionValidation.errors.join(', ')}`);
      }
      
      const windowIdValidation = ValidationUtils.validateWindowId(windowId);
      if (!windowIdValidation.isValid) {
        throw new Error(`Invalid window ID: ${windowIdValidation.errors.join(', ')}`);
      }
      
      const { action, filePath, borders } = actionValidation.sanitized;
      const windowData = this.windowManager.getPreviewWindowData(windowId);
      
      if (!windowData) {
        throw new Error(`Window not found: ${windowId}`);
      }
      
      switch (action) {
        case 'copy-image':
          if (borders) {
            await this.fileManager.copyImageWithBorders(borders);
            log.info('Screenshot with borders copied to clipboard');
            return ErrorHandler.createSuccessResponse('Screenshot with borders copied to clipboard', 'copy-image');
          } else {
            const imageBuffer = await require('fs').promises.readFile(filePath);
            await this.fileManager.copyImageToClipboard(imageBuffer);
            log.info('Screenshot copied to clipboard');
            return ErrorHandler.createSuccessResponse('Screenshot copied to clipboard', 'copy-image');
          }

        case 'copy-path':
          await this.fileManager.copyPathToClipboard(filePath);
          log.info('File path copied to clipboard');
          return ErrorHandler.createSuccessResponse('File path copied to clipboard', 'copy-path');

        case 'save':
          let saveResult;
          if (borders) {
            saveResult = await this.fileManager.saveImageWithBorders(borders, filePath);
            log.info('Screenshot with borders saved');
          } else {
            saveResult = await this.fileManager.saveToLocation(filePath);
            log.info('Original screenshot saved');
          }
          
          if (saveResult.success) {
            // Clear screenshot path since it's now saved permanently
            this.windowManager.updatePreviewWindowPath(windowId, null);
            log.info(`Screenshot saved permanently for window ${windowId}`);
            return ErrorHandler.createSuccessResponse(
              borders ? 'Screenshot with borders saved successfully' : 'Screenshot saved successfully',
              'save',
              { savedPath: saveResult.filePath }
            );
          } else {
            throw new Error('Failed to save screenshot');
          }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    }, 'handlePreviewAction', (error, operation) => {
      return ErrorHandler.handleWindowError(error, operation, windowId);
    });
  }

  openSettingsWindow() {
    // Create settings window using WindowManager
    const settingsWindow = this.windowManager.createSettingsWindow(() => {
      // Callback to provide settings data
      return {
        theme: this.themeManager.getThemeInfo().currentTheme,
        systemTheme: this.themeManager.getThemeInfo().systemTheme,
        settings: {} // Additional settings if needed
      };
    });

    // Add to theme manager for theme updates
    this.themeManager.addWindow(settingsWindow);

    return settingsWindow;
  }

  quitApp() {
    log.info('Quit app requested');
    this.isQuitting = true;
    app.quit();
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
    if (screenshotApp) {
      // Cleanup all managers in proper order
      await screenshotApp.windowManager.cleanup(async (windowData) => {
        if (windowData.screenshotPath) {
          try {
            await screenshotApp.fileManager.deleteFile(windowData.screenshotPath);
            log.info('Cleaned up temporary file during shutdown');
          } catch (error) {
            log.warn('Failed to clean up temporary file:', error.message);
          }
        }
      });
      
      // Dispose all managers
      screenshotApp.screenCaptureManager.dispose();
      await screenshotApp.fileManager.cleanup();
      screenshotApp.themeManager.dispose();
      screenshotApp.trayManager.dispose();
      screenshotApp.ipcHandler.dispose();
    }
    
    // Unregister all global shortcuts only if app is ready
    if (app.isReady()) {
      globalShortcut.unregisterAll();
    }
    
    log.info('App shutting down, all managers disposed');
  } catch (error) {
    log.error('Error during app shutdown:', error);
  }
});

// Start the application
screenshotApp.initialize();

// Export for testing purposes
module.exports = ScreenCaptureApp;