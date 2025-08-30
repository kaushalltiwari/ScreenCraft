const { BrowserWindow, desktopCapturer, screen } = require('electron');
const path = require('path');
const log = require('electron-log');
const ValidationUtils = require('../shared/ValidationUtils');
const ErrorHandler = require('../shared/ErrorHandler');

/**
 * ScreenCaptureManager - Handles screen capture functionality with overlay
 * Design Pattern: Manager/Controller pattern for separation of concerns
 */
class ScreenCaptureManager {
  constructor() {
    this.overlayWindow = null;
    this.capturedScreens = null;
    this.isCapturing = false;
    this.displays = [];
    this.appIcon = null;
  }
  
  /**
   * Set the app icon for windows
   */
  setAppIcon(icon) {
    this.appIcon = icon;
  }

  /**
   * Initialize screen capture system
   */
  async initialize() {
    try {
      this.displays = screen.getAllDisplays();
      log.info(`Screen capture manager initialized with ${this.displays.length} displays`);
      return true;
    } catch (error) {
      log.error('Failed to initialize screen capture manager:', error);
      return false;
    }
  }

  /**
   * Start screen capture process
   * Returns Promise<boolean> - success status
   */
  async startCapture() {
    if (this.isCapturing) {
      log.warn('Capture already in progress');
      return false;
    }

    try {
      this.isCapturing = true;
      log.info('Starting screen capture process...');

      // Step 1: Capture all screens
      const screens = await this.captureAllScreens();
      if (!screens || screens.length === 0) {
        throw new Error('Failed to capture screens');
      }

      this.capturedScreens = screens;
      
      // Step 2: Create overlay for selection
      await this.createOverlayWindow();
      
      log.info('Screen capture overlay ready');
      return true;
    } catch (error) {
      log.error('Screen capture failed:', error);
      this.isCapturing = false;
      return false;
    }
  }

  /**
   * Capture all available screens using desktopCapturer
   */
  async captureAllScreens() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      const screenCaptures = [];
      
      for (const source of sources) {
        // Get screen bounds for this source
        const display = this.displays.find(d => d.id.toString() === source.display_id) || this.displays[0];
        
        screenCaptures.push({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail,
          bounds: display.bounds,
          scaleFactor: display.scaleFactor || 1
        });
      }

      log.info(`Captured ${screenCaptures.length} screens`);
      return screenCaptures;
    } catch (error) {
      log.error('Failed to capture screens:', error);
      throw error;
    }
  }

  /**
   * Create fullscreen overlay window for selection
   */
  async createOverlayWindow() {
    if (this.overlayWindow) {
      this.overlayWindow.close();
    }

    // Calculate combined screen bounds
    const primaryDisplay = screen.getPrimaryDisplay();
    const allDisplays = screen.getAllDisplays();
    
    // For multi-monitor: create overlay covering all screens
    let bounds = primaryDisplay.bounds;
    if (allDisplays.length > 1) {
      // Calculate combined bounds of all displays
      let minX = Math.min(...allDisplays.map(d => d.bounds.x));
      let minY = Math.min(...allDisplays.map(d => d.bounds.y));
      let maxX = Math.max(...allDisplays.map(d => d.bounds.x + d.bounds.width));
      let maxY = Math.max(...allDisplays.map(d => d.bounds.y + d.bounds.height));
      
      bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    this.overlayWindow = new BrowserWindow({
      ...bounds,
      fullscreen: true,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false,
        preload: path.join(__dirname, '..', 'renderer', 'overlay-preload.js')
      }
    });

    // Load the overlay HTML
    await this.overlayWindow.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));

    // Send screen data to overlay
    this.overlayWindow.webContents.once('dom-ready', () => {
      this.overlayWindow.webContents.send('screens-captured', {
        screens: this.capturedScreens,
        displays: this.displays,
        combinedBounds: bounds
      });
    });

    // Handle overlay window events
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      this.isCapturing = false;
    });

    // Don't hide preview windows - only hide non-preview windows if needed
    // Note: Preview windows should remain visible behind the overlay

    log.info('Overlay window created and positioned');
  }

  /**
   * Cancel screen capture process
   */
  cancelCapture() {
    log.info('Cancelling screen capture...');
    
    if (this.overlayWindow) {
      this.overlayWindow.close();
    }
    
    this.isCapturing = false;
    this.capturedScreens = null;
    
    // No need to restore windows since we don't hide them anymore
  }

  /**
   * Process selected area and generate final screenshot
   */
  async processSelection(selectionData) {
    return ErrorHandler.withErrorHandling(async () => {
      log.info('Processing selection:', selectionData);
      
      // Validate selection data
      const validation = ValidationUtils.validateSelectionData(selectionData);
      if (!validation.isValid) {
        throw new Error(`Invalid selection data: ${validation.errors.join(', ')}`);
      }
      
      const { x, y, width, height, screenIndex } = validation.sanitized;
      const selectedScreen = this.capturedScreens[screenIndex];
      
      if (!selectedScreen) {
        throw new Error(`Invalid screen index: ${screenIndex}`);
      }

      // Get full screen capture for processing
      const fullScreenSource = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: selectedScreen.bounds.width * selectedScreen.scaleFactor,
          height: selectedScreen.bounds.height * selectedScreen.scaleFactor
        }
      });

      const screenSource = fullScreenSource.find(s => s.id === selectedScreen.id);
      if (!screenSource) {
        throw new Error('Screen source not found for selected screen');
      }

      // Return validated selection data for further processing
      return {
        success: true,
        selection: { x, y, width, height },
        screen: selectedScreen,
        fullImage: screenSource.thumbnail,
        timestamp: Date.now()
      };
    }, 'processSelection', ErrorHandler.handleScreenCaptureError);
  }

  /**
   * Get current capture status
   */
  isCurrentlyCapturing() {
    return this.isCapturing;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.overlayWindow) {
      this.overlayWindow.close();
    }
    this.isCapturing = false;
    this.capturedScreens = null;
  }
}

module.exports = ScreenCaptureManager;