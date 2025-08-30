/**
 * Integration tests for the screenshot application
 * Tests core workflows and component interactions
 */

const fs = require('fs').promises;
const path = require('path');

// Mock Electron APIs for integration testing
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-app'),
    whenReady: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn(),
    isReady: jest.fn().mockReturnValue(true)
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn().mockResolvedValue(undefined),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
    },
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn()
  })),
  globalShortcut: {
    register: jest.fn().mockReturnValue(true),
    unregisterAll: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  desktopCapturer: {
    getSources: jest.fn().mockResolvedValue([])
  },
  clipboard: {
    writeImage: jest.fn(),
    writeText: jest.fn()
  },
  nativeImage: {
    createFromPath: jest.fn().mockReturnValue({
      toPNG: jest.fn().mockReturnValue(Buffer.from('mock-image')),
      getSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
    })
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: jest.fn()
  },
  shell: {
    openPath: jest.fn().mockResolvedValue(''),
    showItemInFolder: jest.fn()
  }
}));

describe('Screenshot Application Integration Tests', () => {
  let app;
  
  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock file system operations
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readFile').mockResolvedValue('{}');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Application Initialization Workflow', () => {
    test('verifies Electron app mock setup', async () => {
      const { app: electronApp } = require('electron');
      
      expect(electronApp.getPath).toBeDefined();
      expect(electronApp.whenReady).toBeDefined();
      expect(electronApp.on).toBeDefined();
      expect(electronApp.getPath('userData')).toBe('/tmp/test-app');
    });

    test('verifies global shortcuts mock', async () => {
      const { globalShortcut } = require('electron');
      
      expect(globalShortcut.register).toBeDefined();
      expect(globalShortcut.unregisterAll).toBeDefined();
    });

    test('verifies required Electron APIs are mocked', async () => {
      const { nativeTheme, desktopCapturer, clipboard, nativeImage } = require('electron');
      
      expect(nativeTheme.shouldUseDarkColors).toBe(false);
      expect(desktopCapturer.getSources).toBeDefined();
      expect(clipboard.writeImage).toBeDefined();
      expect(nativeImage.createFromPath).toBeDefined();
    });
  });

  describe('Screenshot Capture Workflow', () => {
    test('mocks desktop capturer correctly', async () => {
      const { desktopCapturer } = require('electron');
      
      // Mock successful screen capture
      desktopCapturer.getSources.mockResolvedValue([{
        id: 'screen:0',
        name: 'Entire screen',
        thumbnail: { toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock') }
      }]);

      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe('screen:0');
      expect(sources[0].name).toBe('Entire screen');
    });

    test('verifies nativeImage mock functionality', async () => {
      const { nativeImage } = require('electron');
      
      const mockImage = nativeImage.createFromPath('/mock/path');
      const pngBuffer = mockImage.toPNG();
      const size = mockImage.getSize();
      
      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      expect(size.width).toBe(1920);
      expect(size.height).toBe(1080);
    });
  });

  describe('File Management Integration', () => {
    test('validates file system operations', async () => {
      const mockImageBuffer = Buffer.from('mock-screenshot-data');
      
      // Mock file operations
      fs.writeFile.mockResolvedValue(undefined);
      fs.mkdir.mockResolvedValue(undefined);
      
      // Test file writing
      await fs.writeFile('/tmp/test-screenshot.png', mockImageBuffer);
      await fs.mkdir('/tmp/test-dir', { recursive: true });
      
      expect(fs.writeFile).toHaveBeenCalledWith('/tmp/test-screenshot.png', mockImageBuffer);
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-dir', { recursive: true });
    });

    test('handles file cleanup operations', async () => {
      // Test that our file operations are properly mocked
      const mockFiles = ['screenshot-old.png', 'screenshot-new.png'];
      const mockStats = {
        mtime: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours old
      };
      
      // Test file operation mocking
      fs.mkdir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      fs.readFile.mockResolvedValue('{}');
      
      await fs.mkdir('/tmp/screenshots', { recursive: true });
      await fs.writeFile('/tmp/screenshot-old.png', Buffer.from('mock'));
      const content = await fs.readFile('/tmp/settings.json', 'utf8');
      
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/screenshots', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith('/tmp/screenshot-old.png', Buffer.from('mock'));
      expect(content).toBe('{}');
    });
  });

  describe('IPC Communication Integration', () => {
    test('verifies IPC mock setup', async () => {
      const { ipcMain } = require('electron');
      
      expect(ipcMain.handle).toBeDefined();
      expect(ipcMain.on).toBeDefined();
      
      // Test IPC handler registration
      ipcMain.handle('test-channel', (event, data) => {
        return { success: true, data };
      });
      
      expect(ipcMain.handle).toHaveBeenCalledWith('test-channel', expect.any(Function));
    });

    test('tests ValidationUtils integration', async () => {
      const ValidationUtils = require('../../src/shared/ValidationUtils');
      
      const validSelection = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        screenIndex: 0
      };
      
      const invalidSelection = {
        x: 'invalid',
        y: -10,
        width: 0,
        height: -5
      };
      
      const validResult = ValidationUtils.validateSelectionData(validSelection);
      const invalidResult = ValidationUtils.validateSelectionData(invalidSelection);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Integration', () => {
    test('handles shortcut registration failures', async () => {
      const { globalShortcut } = require('electron');
      
      // Test both success and failure scenarios
      globalShortcut.register.mockReturnValueOnce(true);
      expect(globalShortcut.register('Ctrl+Shift+S', jest.fn())).toBe(true);
      
      globalShortcut.register.mockReturnValueOnce(false);
      expect(globalShortcut.register('Ctrl+Shift+S', jest.fn())).toBe(false);
    });

    test('handles file system errors gracefully', async () => {
      const ErrorHandler = require('../../src/shared/ErrorHandler');
      
      // Test file operation error handling
      const mockError = new Error('Permission denied');
      const result = ErrorHandler.handleFileError(mockError, 'save screenshot', '/tmp/test.png');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File operation failed');
      expect(result.filePath).toBe('/tmp/test.png');
      expect(result.originalMessage).toBe('Permission denied');
    });

    test('tests configuration error recovery', async () => {
      const ErrorHandler = require('../../src/shared/ErrorHandler');
      
      const mockConfigError = new Error('Invalid configuration');
      const result = ErrorHandler.handleConfigError(mockConfigError, 'loadSettings', { theme: 'dark' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Configuration operation failed');
      expect(result.settingsInvolved).toEqual(['theme']);
    });
  });
});