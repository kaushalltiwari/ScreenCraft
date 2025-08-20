const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
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
    this.previewWindow = null;
    this.isQuitting = false;
    this.currentScreenshotPath = null;
    
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
      // Initialize components
      await this.screenCaptureManager.initialize();
      await this.fileManager.initialize();
      
      // Only setup tray and shortcuts - no main window
      this.setupTray();
      this.registerGlobalShortcuts();
      this.setupIPC();
      
      log.info('Screenshot tool initialized successfully');
    } catch (error) {
      log.error('Failed to initialize screenshot tool:', error);
    }
  }

  createPreviewWindow(screenshotData) {
    if (this.previewWindow) {
      this.previewWindow.close();
    }

    // Store current screenshot file path for cleanup
    this.currentScreenshotPath = screenshotData.filePath;

    // Create preview window similar to Snipping Tool
    this.previewWindow = new BrowserWindow({
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
      title: 'Screenshot Preview',
      webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
        preload: path.join(__dirname, 'src', 'renderer', 'preview-preload.js')
      }
    });

    this.previewWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'preview.html'));

    // Handle window close - automatically clean up temporary file
    this.previewWindow.on('close', async () => {
      if (this.currentScreenshotPath) {
        try {
          await this.fileManager.deleteFile(this.currentScreenshotPath);
          log.info('Temporary screenshot file automatically cleaned up on window close');
        } catch (error) {
          log.warn('Failed to clean up temporary screenshot file:', error.message);
        }
        this.currentScreenshotPath = null;
      }
      this.previewWindow = null;
    });

    // Send screenshot data once window is ready
    this.previewWindow.webContents.once('dom-ready', () => {
      this.previewWindow.webContents.send('screenshot-data', screenshotData);
      this.previewWindow.show();
      this.previewWindow.focus();
    });

    log.info('Preview window created');
    return this.previewWindow;
  }

  setupTray() {
    // Create tray icon (you'll need to add an icon file)
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    
    // Fallback if icon doesn't exist yet
    this.tray = new Tray(this.createDefaultIcon());
    
    this.tray.setToolTip('Offline Screenshot Tool');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Take Screenshot (Ctrl+Shift+S)',
        click: () => this.triggerScreenshot()
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
    // Create a simple default icon programmatically
    const { nativeImage } = require('electron');
    
    // Create a 16x16 bitmap with a simple pattern
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4); // RGBA
    
    // Create a simple camera icon pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        // Simple camera-like pattern
        if ((x >= 2 && x <= 13 && y >= 4 && y <= 11) || // Main body
            (x >= 5 && x <= 10 && y >= 2 && y <= 3) ||   // Top part
            (x >= 7 && x <= 8 && y >= 6 && y <= 7)) {    // Lens center
          buffer[index] = 255;     // R
          buffer[index + 1] = 255; // G  
          buffer[index + 2] = 255; // B
          buffer[index + 3] = 255; // A
        } else {
          buffer[index] = 0;       // R
          buffer[index + 1] = 0;   // G
          buffer[index + 2] = 0;   // B
          buffer[index + 3] = 0;   // A (transparent)
        }
      }
    }
    
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
      return await this.handlePreviewAction(actionData);
    });

    // Handle preview window close
    ipcMain.handle('close-preview', () => {
      if (this.previewWindow) {
        this.previewWindow.close();
      }
    });


    // Handle app quit request
    ipcMain.handle('quit-app', () => {
      this.isQuitting = true;
      app.quit();
    });

    log.info('IPC handlers setup complete');
  }

  async triggerScreenshot() {
    log.info('Screenshot triggered - starting capture process');
    
    try {
      // Close any existing preview window
      if (this.previewWindow) {
        this.previewWindow.close();
      }
      
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
  async handlePreviewAction(actionData) {
    try {
      const { action, filePath } = actionData;
      
      switch (action) {
        case 'copy-image':
          // Re-copy image to clipboard
          const imageBuffer = await require('fs').promises.readFile(filePath);
          await this.fileManager.copyImageToClipboard(imageBuffer);
          log.info('Screenshot copied to clipboard');
          return { success: true, message: 'Screenshot copied to clipboard' };

        case 'copy-path':
          // Copy file path to clipboard for Claude Code integration
          await this.fileManager.copyPathToClipboard(filePath);
          log.info('File path copied to clipboard');
          return { success: true, message: 'File path copied to clipboard' };

        case 'save':
          // Save to permanent location
          const saveResult = await this.fileManager.saveToLocation(filePath);
          if (saveResult.success) {
            // Clear current screenshot path since it's now saved permanently
            if (this.currentScreenshotPath === filePath) {
              this.currentScreenshotPath = null;
            }
            log.info('Screenshot saved permanently');
            return { 
              success: true, 
              message: 'Screenshot saved successfully',
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
    
    log.info('App shutting down, components cleaned up');
  } catch (error) {
    log.error('Error during app shutdown:', error);
  }
});

// Start the application
screenshotApp.initialize();

// Export for testing purposes
module.exports = ScreenCaptureApp;