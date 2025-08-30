// Global test setup file
const path = require('path');

// Mock Electron modules globally
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      switch (name) {
        case 'userData': return '/tmp/test-userdata';
        case 'temp': return '/tmp/test-temp';
        default: return '/tmp/test-default';
      }
    }),
    requestSingleInstanceLock: jest.fn(() => true),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    isReady: jest.fn(() => true),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    id: Math.floor(Math.random() * 1000),
    loadFile: jest.fn(),
    webContents: {
      send: jest.fn(),
      once: jest.fn()
    },
    on: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    close: jest.fn(),
    isDestroyed: jest.fn(() => false)
  })),
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn()
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: jest.fn()
  },
  desktopCapturer: {
    getSources: jest.fn(() => Promise.resolve([
      {
        id: 'screen:0:0',
        name: 'Test Screen',
        display_id: '0',
        thumbnail: {
          toPNG: jest.fn(() => Buffer.from('fake-image-data'))
        }
      }
    ]))
  },
  screen: {
    getAllDisplays: jest.fn(() => [
      {
        id: 0,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        scaleFactor: 1
      }
    ]),
    getPrimaryDisplay: jest.fn(() => ({
      id: 0,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1
    }))
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(() => ({}))
  },
  clipboard: {
    writeImage: jest.fn(),
    writeText: jest.fn()
  },
  shell: {
    openPath: jest.fn(() => Promise.resolve())
  },
  nativeImage: {
    createFromPath: jest.fn(() => ({ toPNG: jest.fn(() => Buffer.from('fake-icon')) })),
    createFromBuffer: jest.fn(() => ({ toPNG: jest.fn(() => Buffer.from('fake-icon')) }))
  }
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  transports: {
    file: { level: 'info' },
    console: { level: 'debug' }
  }
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
    copyFile: jest.fn()
  },
  existsSync: jest.fn(() => false)
}));

// Mock path
const originalPath = jest.requireActual('path');
jest.mock('path', () => ({
  ...originalPath,
  join: (...args) => originalPath.join(...args)
}));

// Mock temp module
jest.mock('temp', () => ({
  track: jest.fn(),
  mkdirSync: jest.fn(() => '/tmp/test-screenshot-dir'),
  cleanup: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock jimp
jest.mock('jimp', () => ({
  Jimp: {
    read: jest.fn(() => Promise.resolve({
      clone: jest.fn().mockReturnThis(),
      crop: jest.fn().mockReturnThis(),
      getBuffer: jest.fn(() => Promise.resolve(Buffer.from('fake-image'))),
      bitmap: { width: 100, height: 100 }
    }))
  }
}));

// Global test utilities
global.createMockSelectionData = (overrides = {}) => ({
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  screenIndex: 0,
  ...overrides
});

global.createMockScreenshotData = (overrides = {}) => ({
  filePath: '/tmp/test-screenshot.png',
  filename: 'test-screenshot.png',
  fileSize: 1024,
  dimensions: { width: 100, height: 50 },
  timestamp: Date.now(),
  ...overrides
});

// Console override for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});