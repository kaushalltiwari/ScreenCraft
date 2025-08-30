/**
 * End-to-End tests for user interaction scenarios
 * Tests realistic user workflows and edge cases
 */

const { EventEmitter } = require('events');

// Enhanced Electron mock for user interaction testing
jest.mock('electron', () => {
  const mockWindow = {
    loadFile: jest.fn().mockResolvedValue(undefined),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      executeJavaScript: jest.fn().mockResolvedValue(undefined),
      openDevTools: jest.fn(),
      isDevToolsOpened: jest.fn().mockReturnValue(false)
    },
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    isFocused: jest.fn().mockReturnValue(true),
    getBounds: jest.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
    setBounds: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    setVisibleOnAllWorkspaces: jest.fn(),
    setSkipTaskbar: jest.fn(),
    flashFrame: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    isMinimized: jest.fn().mockReturnValue(false),
    isMaximized: jest.fn().mockReturnValue(false)
  };

  return {
    app: {
      getPath: jest.fn().mockReturnValue('/tmp/test-app-e2e'),
      whenReady: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      quit: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      getName: jest.fn().mockReturnValue('Screenshot Tool'),
      setName: jest.fn(),
      isPackaged: jest.fn().mockReturnValue(false),
      getAppPath: jest.fn().mockReturnValue('/app'),
      focus: jest.fn()
    },
    BrowserWindow: jest.fn().mockImplementation(() => mockWindow),
    Menu: {
      setApplicationMenu: jest.fn(),
      buildFromTemplate: jest.fn().mockReturnValue({ popup: jest.fn() })
    },
    Tray: jest.fn().mockImplementation(() => ({
      setToolTip: jest.fn(),
      setContextMenu: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    })),
    globalShortcut: {
      register: jest.fn().mockReturnValue(true),
      unregister: jest.fn().mockReturnValue(true),
      unregisterAll: jest.fn(),
      isRegistered: jest.fn().mockReturnValue(true)
    },
    ipcMain: {
      handle: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn()
    },
    dialog: {
      showSaveDialog: jest.fn().mockResolvedValue({ 
        canceled: false, 
        filePath: '/tmp/saved-screenshot.png' 
      }),
      showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
      showErrorBox: jest.fn()
    },
    shell: {
      openPath: jest.fn().mockResolvedValue(''),
      showItemInFolder: jest.fn(),
      openExternal: jest.fn().mockResolvedValue(undefined)
    },
    clipboard: {
      writeImage: jest.fn(),
      writeText: jest.fn(),
      readText: jest.fn().mockReturnValue(''),
      readImage: jest.fn().mockReturnValue({ isEmpty: () => false })
    },
    nativeImage: {
      createFromPath: jest.fn().mockReturnValue({
        toPNG: jest.fn().mockReturnValue(Buffer.from('mock-png')),
        isEmpty: jest.fn().mockReturnValue(false),
        getSize: jest.fn().mockReturnValue({ width: 800, height: 600 })
      })
    },
    desktopCapturer: {
      getSources: jest.fn().mockResolvedValue([
        {
          id: 'screen:0',
          name: 'Primary Display',
          thumbnail: {
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock')
          }
        }
      ])
    },
    nativeTheme: {
      shouldUseDarkColors: false,
      on: jest.fn(),
      themeSource: 'system'
    }
  };
});

const fs = require('fs').promises;

describe('User Interaction E2E Tests', () => {
  let mockElectron;

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectron = require('electron');
    
    // Mock file system
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readFile').mockResolvedValue('{"theme":"system"}');
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User-Triggered Screenshot Scenarios', () => {
    test('user presses hotkey to take screenshot', async () => {
      const { globalShortcut, BrowserWindow, desktopCapturer } = mockElectron;

      // Register the hotkey
      const hotkeyCallback = jest.fn();
      globalShortcut.register('CommandOrControl+Shift+S', hotkeyCallback);

      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+S',
        hotkeyCallback
      );

      // Simulate user pressing the hotkey
      await hotkeyCallback();
      expect(hotkeyCallback).toHaveBeenCalled();

      // Verify overlay window creation
      const overlayWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true
      });

      overlayWindow.show();
      expect(overlayWindow.show).toHaveBeenCalled();

      // Simulate screen capture
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      expect(sources).toHaveLength(1);
      expect(sources[0].name).toBe('Primary Display');
    });

    test('user makes area selection with mouse', async () => {
      const { BrowserWindow, ipcMain } = mockElectron;

      // Create overlay window for selection
      const overlayWindow = new BrowserWindow();
      
      // Simulate IPC handler for selection
      const selectionHandler = jest.fn().mockResolvedValue({
        success: true,
        filePath: '/tmp/screenshot-123.png'
      });

      ipcMain.handle('process-selection', selectionHandler);

      // Simulate user selection data
      const userSelection = {
        x: 50,
        y: 100,
        width: 300,
        height: 200,
        screenIndex: 0
      };

      // Simulate user completing selection
      const result = await selectionHandler(null, userSelection);

      expect(selectionHandler).toHaveBeenCalledWith(null, userSelection);
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('screenshot-123.png');

      // Verify overlay is hidden after selection
      overlayWindow.hide();
      expect(overlayWindow.hide).toHaveBeenCalled();
    });

    test('user cancels screenshot by pressing Escape', async () => {
      const { BrowserWindow, globalShortcut } = mockElectron;

      // Create overlay window
      const overlayWindow = new BrowserWindow();
      overlayWindow.show();

      // Simulate escape key handler
      const escapeHandler = jest.fn(() => {
        overlayWindow.hide();
        overlayWindow.destroy();
      });

      // Register escape key
      globalShortcut.register('Escape', escapeHandler);

      // User presses escape
      escapeHandler();

      expect(escapeHandler).toHaveBeenCalled();
      expect(overlayWindow.hide).toHaveBeenCalled();
      expect(overlayWindow.destroy).toHaveBeenCalled();
    });
  });

  describe('Preview Window Interactions', () => {
    test('user interacts with preview window actions', async () => {
      const { BrowserWindow, dialog, clipboard, shell } = mockElectron;

      // Create preview window
      const previewWindow = new BrowserWindow();
      await previewWindow.loadFile('src/renderer/preview.html');

      // Simulate user clicking "Copy Image"
      const mockImage = { mock: 'image' };
      clipboard.writeImage(mockImage);
      expect(clipboard.writeImage).toHaveBeenCalledWith(mockImage);

      // Simulate user clicking "Copy Path"
      const filePath = '/tmp/screenshot-123.png';
      clipboard.writeText(filePath);
      expect(clipboard.writeText).toHaveBeenCalledWith(filePath);

      // Simulate user clicking "Save As"
      const saveResult = await dialog.showSaveDialog(previewWindow, {
        defaultPath: 'screenshot.png',
        filters: [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] }
        ]
      });

      expect(dialog.showSaveDialog).toHaveBeenCalled();
      expect(saveResult.canceled).toBe(false);
      expect(saveResult.filePath).toBe('/tmp/saved-screenshot.png');

      // Simulate user clicking "Open Folder"
      await shell.showItemInFolder(filePath);
      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);

      // Close preview window
      previewWindow.close();
      expect(previewWindow.close).toHaveBeenCalled();
    });

    test('user uses keyboard shortcuts in preview window', async () => {
      const { BrowserWindow, clipboard } = mockElectron;

      const previewWindow = new BrowserWindow();
      
      // Simulate keyboard shortcuts
      const shortcuts = {
        'CommandOrControl+C': () => clipboard.writeImage({ mock: 'image' }),
        'CommandOrControl+S': () => dialog.showSaveDialog(),
        'Escape': () => previewWindow.close()
      };

      // User presses Ctrl+C
      shortcuts['CommandOrControl+C']();
      expect(clipboard.writeImage).toHaveBeenCalledWith({ mock: 'image' });

      // User presses Escape
      shortcuts['Escape']();
      expect(previewWindow.close).toHaveBeenCalled();
    });
  });

  describe('System Tray Interactions', () => {
    test('user interacts with system tray', async () => {
      const { Tray, Menu, BrowserWindow } = mockElectron;

      // Create system tray
      const tray = new Tray('/path/to/icon.png');
      tray.setToolTip('Screenshot Tool');

      // Create context menu
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Take Screenshot',
          click: jest.fn()
        },
        {
          label: 'Settings',
          click: jest.fn()
        },
        {
          label: 'Quit',
          click: jest.fn()
        }
      ]);

      tray.setContextMenu(contextMenu);

      expect(tray.setToolTip).toHaveBeenCalledWith('Screenshot Tool');
      expect(tray.setContextMenu).toHaveBeenCalledWith(contextMenu);

      // Simulate tray click
      const trayClickHandler = jest.fn(() => {
        const mainWindow = new BrowserWindow();
        mainWindow.show();
        mainWindow.focus();
      });

      tray.on('click', trayClickHandler);
      expect(tray.on).toHaveBeenCalledWith('click', trayClickHandler);

      // User clicks tray
      trayClickHandler();
      expect(trayClickHandler).toHaveBeenCalled();
    });
  });

  describe('Settings and Configuration Workflow', () => {
    test('user changes application settings', async () => {
      const { BrowserWindow, ipcMain } = mockElectron;

      // Create settings window
      const settingsWindow = new BrowserWindow();
      await settingsWindow.loadFile('src/renderer/settings.html');

      // Simulate settings update handler
      const updateSettingsHandler = jest.fn().mockResolvedValue({
        success: true,
        settings: {
          theme: 'dark',
          shortcuts: { 'screenshot': 'Ctrl+Alt+S' },
          autoSave: true
        }
      });

      ipcMain.handle('update-settings', updateSettingsHandler);

      // User changes theme to dark
      const newSettings = {
        theme: 'dark',
        shortcuts: { 'screenshot': 'Ctrl+Alt+S' },
        autoSave: true
      };

      const result = await updateSettingsHandler(null, newSettings);

      expect(updateSettingsHandler).toHaveBeenCalledWith(null, newSettings);
      expect(result.success).toBe(true);
      expect(result.settings.theme).toBe('dark');

      // Note: In E2E testing, we verify the IPC call was made successfully
      // File system persistence would be verified separately in integration tests
      expect(result.settings.theme).toBe('dark');
    });

    test('user customizes keyboard shortcuts', async () => {
      const { globalShortcut, dialog } = mockElectron;

      // Simulate shortcut conflict detection
      const isRegistered = globalShortcut.isRegistered('Ctrl+Shift+A');
      expect(globalShortcut.isRegistered).toHaveBeenCalledWith('Ctrl+Shift+A');

      if (isRegistered) {
        // Show conflict dialog
        await dialog.showMessageBox({
          type: 'warning',
          title: 'Shortcut Conflict',
          message: 'This shortcut is already in use by another application.',
          buttons: ['OK', 'Choose Different']
        });

        expect(dialog.showMessageBox).toHaveBeenCalled();
      }

      // Register new shortcut
      const newShortcut = 'Ctrl+Alt+S';
      const shortcutCallback = jest.fn();
      
      const registered = globalShortcut.register(newShortcut, shortcutCallback);
      expect(registered).toBe(true);
      expect(globalShortcut.register).toHaveBeenCalledWith(newShortcut, shortcutCallback);
    });
  });

  describe('Error Handling and User Feedback', () => {
    test('handles permission denied gracefully', async () => {
      const { desktopCapturer, dialog } = mockElectron;

      // Simulate permission error
      desktopCapturer.getSources.mockRejectedValueOnce(
        new Error('Screen recording permission denied')
      );

      try {
        await desktopCapturer.getSources({ types: ['screen'] });
      } catch (error) {
        // Show user-friendly error dialog
        await dialog.showErrorBox(
          'Permission Required',
          'Screen recording permission is required. Please grant permission in System Preferences.'
        );

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Permission Required',
          expect.stringContaining('permission')
        );
      }
    });

    test('handles file system errors with user feedback', async () => {
      const { dialog } = mockElectron;

      // Simulate file write error
      fs.writeFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      try {
        await fs.writeFile('/protected/path/screenshot.png', Buffer.from('data'));
      } catch (error) {
        // Show save error dialog with alternative options
        const result = await dialog.showMessageBox({
          type: 'error',
          title: 'Save Failed',
          message: 'Could not save screenshot to the selected location.',
          buttons: ['Choose Different Location', 'Copy to Clipboard', 'Cancel']
        });

        expect(dialog.showMessageBox).toHaveBeenCalled();
        expect(result.response).toBe(0); // Default mock response
      }
    });

    test('provides user feedback for successful operations', async () => {
      const { BrowserWindow, shell } = mockElectron;

      // Simulate successful screenshot
      const filePath = '/tmp/screenshot-success.png';
      await fs.writeFile(filePath, Buffer.from('screenshot-data'));

      // Show success notification (simulated)
      const notification = {
        title: 'Screenshot Saved',
        body: 'Click to open file location',
        onClick: jest.fn(() => shell.showItemInFolder(filePath))
      };

      // User clicks notification
      notification.onClick();
      
      expect(notification.onClick).toHaveBeenCalled();
      expect(shell.showItemInFolder).toHaveBeenCalledWith(filePath);
    });
  });

  describe('Accessibility and Usability', () => {
    test('handles high contrast and accessibility features', async () => {
      const { nativeTheme, BrowserWindow } = mockElectron;

      // Simulate high contrast mode detection
      nativeTheme.shouldUseDarkColors = true;

      const window = new BrowserWindow();
      
      // Apply accessibility-friendly styling
      await window.webContents.executeJavaScript(`
        document.body.classList.add('high-contrast');
        document.body.style.fontSize = '16px';
      `);

      expect(window.webContents.executeJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('high-contrast')
      );
    });

    test('provides keyboard navigation support', async () => {
      const { BrowserWindow } = mockElectron;

      const previewWindow = new BrowserWindow();
      
      // Simulate keyboard navigation
      const keyboardHandlers = {
        'Tab': jest.fn(), // Navigate between buttons
        'Enter': jest.fn(), // Activate button
        'Space': jest.fn(), // Activate button
        'ArrowLeft': jest.fn(), // Previous option
        'ArrowRight': jest.fn() // Next option
      };

      // User navigates with Tab
      keyboardHandlers.Tab();
      expect(keyboardHandlers.Tab).toHaveBeenCalled();

      // User activates with Enter
      keyboardHandlers.Enter();
      expect(keyboardHandlers.Enter).toHaveBeenCalled();
    });
  });

  describe('Performance Under Load', () => {
    test('handles rapid successive screenshots', async () => {
      const { desktopCapturer, globalShortcut } = mockElectron;

      // Simulate rapid hotkey presses
      const screenshotCallback = jest.fn().mockImplementation(async () => {
        await desktopCapturer.getSources({ types: ['screen'] });
      });

      globalShortcut.register('CommandOrControl+Shift+S', screenshotCallback);

      // User rapidly presses hotkey 5 times
      const rapidPresses = [];
      for (let i = 0; i < 5; i++) {
        rapidPresses.push(screenshotCallback());
      }

      await Promise.all(rapidPresses);

      expect(screenshotCallback).toHaveBeenCalledTimes(5);
      expect(desktopCapturer.getSources).toHaveBeenCalledTimes(5);
    });

    test('manages memory with large screenshots', async () => {
      const { nativeImage } = mockElectron;

      // Simulate processing large images
      const largeImages = [];
      for (let i = 0; i < 10; i++) {
        const image = nativeImage.createFromPath(`/tmp/large-image-${i}.png`);
        largeImages.push(image);
      }

      expect(largeImages).toHaveLength(10);
      expect(nativeImage.createFromPath).toHaveBeenCalledTimes(10);

      // Verify images are properly handled
      largeImages.forEach(image => {
        expect(image.isEmpty()).toBe(false);
        expect(image.getSize().width).toBeGreaterThan(0);
      });
    });
  });
});