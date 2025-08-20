const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { clipboard, shell } = require('electron');
const { Jimp } = require('jimp');
const { v4: uuidv4 } = require('uuid');
const temp = require('temp');
const log = require('electron-log');
const CONSTANTS = require('../shared/constants');

// Automatically track and cleanup temp files
temp.track();

/**
 * FileManager - Handles all file operations for screenshots
 * Design Pattern: Service pattern for file operations
 */
class FileManager {
  constructor() {
    this.tempDir = null;
    this.defaultSaveLocation = path.join(os.homedir(), 'Pictures');
  }

  /**
   * Initialize file manager
   */
  async initialize() {
    try {
      // Create temp directory for screenshot files
      this.tempDir = temp.mkdirSync('screenshot-tool-');
      log.info(`File manager initialized with temp directory: ${this.tempDir}`);
      return true;
    } catch (error) {
      log.error('Failed to initialize file manager:', error);
      return false;
    }
  }

  /**
   * Process and save screenshot from selection
   */
  async processScreenshot(captureData) {
    try {
      const { selection, screen, fullImage, timestamp } = captureData;
      
      // Convert Electron nativeImage to buffer
      const fullImageBuffer = fullImage.toPNG();
      
      // Crop the selected area using Sharp
      const { x, y, width, height } = selection;
      const scaleFactor = screen.scaleFactor || 1;
      
      // Adjust coordinates for high DPI displays  
      const cropX = Math.round(x * scaleFactor);
      const cropY = Math.round(y * scaleFactor);
      const cropWidth = Math.round(width * scaleFactor);
      const cropHeight = Math.round(height * scaleFactor);

      // Use Jimp for image processing instead of Sharp
      const image = await Jimp.read(fullImageBuffer);
      const croppedImage = image.clone().crop({ x: cropX, y: cropY, w: cropWidth, h: cropHeight });
      const croppedBuffer = await croppedImage.getBuffer('image/png');

      // Generate unique filename
      const filename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}-${uuidv4().slice(0, CONSTANTS.FILES.UUID_SLICE_LENGTH)}.png`;
      const tempFilePath = path.join(this.tempDir, filename);

      // Save to temp directory
      await fs.writeFile(tempFilePath, croppedBuffer);

      // Also copy to clipboard immediately
      await this.copyImageToClipboard(croppedBuffer);

      log.info(`Screenshot processed and saved: ${tempFilePath}`);

      return {
        success: true,
        filePath: tempFilePath,
        filename: filename,
        fileSize: croppedBuffer.length,
        dimensions: { width, height },
        timestamp: timestamp
      };

    } catch (error) {
      log.error('Failed to process screenshot:', error);
      throw error;
    }
  }

  /**
   * Copy image to clipboard
   */
  async copyImageToClipboard(imageBuffer) {
    try {
      const { nativeImage } = require('electron');
      const image = nativeImage.createFromBuffer(imageBuffer);
      clipboard.writeImage(image);
      log.info('Screenshot copied to clipboard');
    } catch (error) {
      log.error('Failed to copy image to clipboard:', error);
      throw error;
    }
  }

  /**
   * Copy file path to clipboard (for Claude Code integration)
   */
  async copyPathToClipboard(filePath) {
    try {
      clipboard.writeText(filePath);
      log.info(`File path copied to clipboard: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      log.error('Failed to copy path to clipboard:', error);
      throw error;
    }
  }

  /**
   * Save screenshot to permanent location with file dialog
   */
  async saveToLocation(sourceFilePath, customPath = null) {
    try {
      let targetPath;
      
      if (customPath) {
        // Use provided custom path
        targetPath = customPath;
      } else {
        // Show Save As dialog
        const { dialog } = require('electron');
        const sourceFilename = path.basename(sourceFilePath);
        const defaultFilename = sourceFilename.replace(/screenshot-.*?-/, 'Screenshot_');
        
        const saveResult = await dialog.showSaveDialog({
          title: 'Save Screenshot As',
          defaultPath: path.join(this.defaultSaveLocation, defaultFilename),
          filters: [
            { name: 'PNG Images', extensions: ['png'] },
            { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['createDirectory']
        });

        if (saveResult.canceled) {
          return { success: false, message: 'Save cancelled by user' };
        }

        targetPath = saveResult.filePath;
      }

      // Ensure target directory exists
      const targetDirectory = path.dirname(targetPath);
      await fs.mkdir(targetDirectory, { recursive: true });

      // Copy from temp to permanent location
      await fs.copyFile(sourceFilePath, targetPath);

      log.info(`Screenshot saved to permanent location: ${targetPath}`);
      
      return {
        success: true,
        filePath: targetPath,
        directory: targetDirectory
      };
    } catch (error) {
      log.error('Failed to save screenshot:', error);
      throw error;
    }
  }

  /**
   * Open file location in system file explorer
   */
  async openFileLocation(filePath) {
    try {
      const directory = path.dirname(filePath);
      await shell.openPath(directory);
      log.info(`Opened file location: ${directory}`);
      return { success: true };
    } catch (error) {
      log.error('Failed to open file location:', error);
      throw error;
    }
  }

  /**
   * Delete temporary file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      log.info(`Temporary file deleted: ${filePath}`);
      return { success: true };
    } catch (error) {
      log.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      
      // Get image dimensions using Jimp
      const image = await Jimp.read(buffer);
      const metadata = {
        width: image.bitmap.width,
        height: image.bitmap.height,
        format: 'png'
      };
      
      return {
        success: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        format: metadata.format
      };
    } catch (error) {
      log.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Cleanup temp files (called on app exit)
   */
  async cleanup() {
    try {
      temp.cleanup();
      log.info('Temporary files cleaned up');
    } catch (error) {
      log.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Get default save location
   */
  getDefaultSaveLocation() {
    return this.defaultSaveLocation;
  }

  /**
   * Set default save location
   */
  setDefaultSaveLocation(location) {
    this.defaultSaveLocation = location;
    log.info(`Default save location updated: ${location}`);
  }
}

module.exports = FileManager;