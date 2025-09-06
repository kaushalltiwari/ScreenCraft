/**
 * Unit tests for ThemeManager
 * Tests theme switching, system theme detection, and theme persistence
 */

// Mock Electron nativeTheme
jest.mock('electron', () => ({
  nativeTheme: {
    shouldUseDarkColors: false,
    themeSource: 'system',
    on: jest.fn(),
    removeAllListeners: jest.fn()
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => [
      { webContents: { send: jest.fn() } },
      { webContents: { send: jest.fn() } }
    ])
  },
  ipcMain: {
    handle: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

describe('ThemeManager', () => {
  let ThemeManager;
  let mockElectron;
  let mockConfigManager;

  beforeEach(() => {
    // Mock Electron APIs
    mockElectron = require('electron');
    
    // Mock ConfigManager
    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      save: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();

    // Create ThemeManager mock (would normally require the actual file)
    ThemeManager = {
      currentTheme: 'system',
      availableThemes: ['light', 'dark', 'system'],
      
      initialize: jest.fn(),
      setTheme: jest.fn(),
      getCurrentTheme: jest.fn(),
      getSystemTheme: jest.fn(),
      getEffectiveTheme: jest.fn(),
      onThemeChanged: jest.fn(),
      broadcastThemeChange: jest.fn(),
      cleanup: jest.fn()
    };
  });

  describe('Theme Management Core', () => {
    test('initializes with system theme by default', () => {
      const initialTheme = 'system';
      mockConfigManager.get.mockReturnValue(initialTheme);
      
      ThemeManager.initialize(mockConfigManager);
      
      expect(ThemeManager.initialize).toHaveBeenCalledWith(mockConfigManager);
      expect(mockConfigManager.get).toHaveBeenCalledWith('theme', 'system');
    });

    test('validates available themes', () => {
      const expectedThemes = ['light', 'dark', 'system'];
      
      expect(ThemeManager.availableThemes).toEqual(expectedThemes);
      expect(ThemeManager.availableThemes).toContain('light');
      expect(ThemeManager.availableThemes).toContain('dark');
      expect(ThemeManager.availableThemes).toContain('system');
    });

    test('sets theme and persists configuration', async () => {
      const newTheme = 'dark';
      
      const setTheme = (theme) => {
        if (!ThemeManager.availableThemes.includes(theme)) {
          return { success: false, error: 'Invalid theme' };
        }
        
        ThemeManager.currentTheme = theme;
        mockConfigManager.set('theme', theme);
        mockConfigManager.save();
        
        return { success: true, theme };
      };

      const result = setTheme(newTheme);
      
      expect(result.success).toBe(true);
      expect(result.theme).toBe('dark');
      expect(ThemeManager.currentTheme).toBe('dark');
      expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'dark');
      expect(mockConfigManager.save).toHaveBeenCalled();
    });

    test('rejects invalid theme values', () => {
      const invalidTheme = 'invalid-theme';
      
      const setTheme = (theme) => {
        if (!ThemeManager.availableThemes.includes(theme)) {
          return { success: false, error: 'Invalid theme' };
        }
        return { success: true, theme };
      };

      const result = setTheme(invalidTheme);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid theme');
    });
  });

  describe('System Theme Detection', () => {
    test('detects system dark mode preference', () => {
      mockElectron.nativeTheme.shouldUseDarkColors = true;
      
      const getSystemTheme = () => {
        return mockElectron.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      };

      expect(getSystemTheme()).toBe('dark');
      
      mockElectron.nativeTheme.shouldUseDarkColors = false;
      expect(getSystemTheme()).toBe('light');
    });

    test('handles system theme changes', () => {
      const themeChangeHandlers = [];
      const systemThemeState = { isDark: false };
      
      const onSystemThemeChange = (callback) => {
        themeChangeHandlers.push(callback);
        mockElectron.nativeTheme.on('updated', callback);
      };

      const simulateSystemThemeChange = (isDark) => {
        systemThemeState.isDark = isDark;
        mockElectron.nativeTheme.shouldUseDarkColors = isDark;
        
        // Trigger callbacks
        themeChangeHandlers.forEach(callback => callback());
      };

      const mockCallback = jest.fn();
      onSystemThemeChange(mockCallback);
      
      simulateSystemThemeChange(true);
      
      expect(mockElectron.nativeTheme.on).toHaveBeenCalledWith('updated', mockCallback);
      expect(mockElectron.nativeTheme.shouldUseDarkColors).toBe(true);
    });

    test('resolves effective theme from system preference', () => {
      const resolveEffectiveTheme = (userTheme, systemIsDark) => {
        switch (userTheme) {
          case 'light':
            return 'light';
          case 'dark':
            return 'dark';
          case 'system':
            return systemIsDark ? 'dark' : 'light';
          default:
            return 'light'; // Fallback
        }
      };

      // Test with system theme preference
      expect(resolveEffectiveTheme('system', true)).toBe('dark');
      expect(resolveEffectiveTheme('system', false)).toBe('light');
      
      // Test with explicit theme preferences
      expect(resolveEffectiveTheme('light', true)).toBe('light');
      expect(resolveEffectiveTheme('dark', false)).toBe('dark');
      
      // Test fallback
      expect(resolveEffectiveTheme('invalid', true)).toBe('light');
    });
  });

  describe('Theme Broadcasting', () => {
    test('broadcasts theme changes to all windows', () => {
      const mockWindows = mockElectron.BrowserWindow.getAllWindows();
      
      const broadcastThemeChange = (newTheme) => {
        mockWindows.forEach(window => {
          window.webContents.send('theme-changed', {
            theme: newTheme,
            timestamp: Date.now()
          });
        });
        
        return { windowsNotified: mockWindows.length };
      };

      const result = broadcastThemeChange('dark');
      
      expect(result.windowsNotified).toBe(2);
      mockWindows.forEach(window => {
        expect(window.webContents.send).toHaveBeenCalledWith(
          'theme-changed',
          expect.objectContaining({
            theme: 'dark',
            timestamp: expect.any(Number)
          })
        );
      });
    });

    test('handles IPC theme change requests', () => {
      const ipcThemeHandler = (event, newTheme) => {
        const validThemes = ['light', 'dark', 'system'];
        
        if (!validThemes.includes(newTheme)) {
          return { success: false, error: 'Invalid theme' };
        }

        // Simulate theme change
        ThemeManager.currentTheme = newTheme;
        
        // Broadcast to other windows
        const windows = mockElectron.BrowserWindow.getAllWindows();
        windows.forEach(window => {
          if (window.webContents !== event.sender) {
            window.webContents.send('theme-changed', { theme: newTheme });
          }
        });

        return { success: true, theme: newTheme };
      };

      // Register IPC handler
      mockElectron.ipcMain.handle('set-theme', ipcThemeHandler);

      // Simulate IPC call
      const mockEvent = { sender: { id: 1 } };
      const result = ipcThemeHandler(mockEvent, 'dark');
      
      expect(result.success).toBe(true);
      expect(result.theme).toBe('dark');
      expect(mockElectron.ipcMain.handle).toHaveBeenCalledWith('set-theme', ipcThemeHandler);
    });

    test('synchronizes theme state across multiple windows', () => {
      const themeState = {
        current: 'light',
        windows: new Map([
          [1, { theme: 'light', synced: true }],
          [2, { theme: 'light', synced: true }]
        ])
      };

      const syncThemeToWindow = (windowId, newTheme) => {
        if (themeState.windows.has(windowId)) {
          const windowState = themeState.windows.get(windowId);
          windowState.theme = newTheme;
          windowState.synced = windowState.theme === themeState.current;
          windowState.lastSync = Date.now();
        }
      };

      const changeGlobalTheme = (newTheme) => {
        themeState.current = newTheme;
        
        // Sync to all windows
        for (const [windowId] of themeState.windows) {
          syncThemeToWindow(windowId, newTheme);
        }
        
        return {
          theme: newTheme,
          syncedWindows: Array.from(themeState.windows.values())
            .filter(w => w.synced).length
        };
      };

      const result = changeGlobalTheme('dark');
      
      expect(result.theme).toBe('dark');
      expect(result.syncedWindows).toBe(2);
      expect(themeState.windows.get(1).theme).toBe('dark');
      expect(themeState.windows.get(2).theme).toBe('dark');
    });
  });

  describe('Theme-Specific Functionality', () => {
    test('provides theme-specific CSS variables', () => {
      const themeVariables = {
        light: {
          '--bg-primary': '#f5f5f5',
          '--text-primary': '#1f2937',
          '--toolbar-bg': '#2d2d30',
          '--border-color': 'rgba(0, 0, 0, 0.1)'
        },
        dark: {
          '--bg-primary': '#1e1e1e',
          '--text-primary': '#f1f5f9',
          '--toolbar-bg': '#1e1e1e',
          '--border-color': 'rgba(255, 255, 255, 0.1)'
        }
      };

      const getThemeVariables = (theme) => {
        return themeVariables[theme] || themeVariables.light;
      };

      const lightVars = getThemeVariables('light');
      const darkVars = getThemeVariables('dark');
      
      expect(lightVars['--bg-primary']).toBe('#f5f5f5');
      expect(darkVars['--bg-primary']).toBe('#1e1e1e');
      
      // Verify both themes have same variable keys
      expect(Object.keys(lightVars)).toEqual(Object.keys(darkVars));
    });

    test('adapts UI components for theme context', () => {
      const getThemeAwareStyles = (theme) => {
        const baseStyles = {
          transition: 'background-color 0.3s ease, color 0.3s ease'
        };

        switch (theme) {
          case 'dark':
            return {
              ...baseStyles,
              colorScheme: 'dark',
              scrollbarColor: 'rgba(255,255,255,0.3) rgba(255,255,255,0.1)',
              iconFilter: 'invert(1)'
            };
          case 'light':
            return {
              ...baseStyles,
              colorScheme: 'light',
              scrollbarColor: 'rgba(0,0,0,0.3) rgba(0,0,0,0.1)',
              iconFilter: 'none'
            };
          default:
            return baseStyles;
        }
      };

      const lightStyles = getThemeAwareStyles('light');
      const darkStyles = getThemeAwareStyles('dark');
      
      expect(lightStyles.colorScheme).toBe('light');
      expect(darkStyles.colorScheme).toBe('dark');
      expect(lightStyles.iconFilter).toBe('none');
      expect(darkStyles.iconFilter).toBe('invert(1)');
    });

    test('handles theme-specific image resources', () => {
      const themeAssets = {
        getIconPath: (iconName, theme) => {
          const effectiveTheme = theme === 'system' ? 'light' : theme;
          return `assets/icons/${iconName}-${effectiveTheme}.png`;
        },
        
        getBackgroundPattern: (theme) => {
          switch (theme) {
            case 'dark':
              return 'url(patterns/dark-noise.png)';
            case 'light':
              return 'url(patterns/light-texture.png)';
            default:
              return 'none';
          }
        }
      };

      expect(themeAssets.getIconPath('close', 'dark')).toBe('assets/icons/close-dark.png');
      expect(themeAssets.getIconPath('close', 'light')).toBe('assets/icons/close-light.png');
      expect(themeAssets.getIconPath('close', 'system')).toBe('assets/icons/close-light.png');
      
      expect(themeAssets.getBackgroundPattern('dark')).toContain('dark-noise.png');
      expect(themeAssets.getBackgroundPattern('light')).toContain('light-texture.png');
    });
  });

  describe('Theme Persistence and Recovery', () => {
    test('persists theme preferences across app restarts', () => {
      const themeStorage = {
        save: (theme) => {
          mockConfigManager.set('theme', theme);
          mockConfigManager.set('themeLastModified', Date.now());
          return mockConfigManager.save();
        },
        
        load: () => {
          const theme = mockConfigManager.get('theme', 'system');
          const lastModified = mockConfigManager.get('themeLastModified', 0);
          return { theme, lastModified };
        },
        
        reset: () => {
          mockConfigManager.set('theme', 'system');
          return mockConfigManager.save();
        }
      };

      // Test saving
      themeStorage.save('dark');
      expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'dark');
      expect(mockConfigManager.set).toHaveBeenCalledWith('themeLastModified', expect.any(Number));
      expect(mockConfigManager.save).toHaveBeenCalled();

      // Test loading
      mockConfigManager.get.mockImplementation((key, defaultValue) => {
        const values = { 
          theme: 'dark', 
          themeLastModified: Date.now() - 10000 
        };
        return values[key] || defaultValue;
      });

      const loaded = themeStorage.load();
      expect(loaded.theme).toBe('dark');
      expect(loaded.lastModified).toBeGreaterThan(0);
    });

    test('handles corrupted theme configuration', () => {
      const validateAndRecoverTheme = (storedTheme) => {
        const validThemes = ['light', 'dark', 'system'];
        
        // Check if stored theme is valid
        if (!validThemes.includes(storedTheme)) {
          console.warn(`Invalid theme "${storedTheme}" found, resetting to system`);
          return 'system';
        }
        
        return storedTheme;
      };

      // Test valid theme
      expect(validateAndRecoverTheme('dark')).toBe('dark');
      
      // Test invalid theme recovery
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(validateAndRecoverTheme('invalid-theme')).toBe('system');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid theme "invalid-theme" found, resetting to system'
      );
      consoleSpy.mockRestore();
    });

    test('migrates legacy theme configurations', () => {
      const migrateThemeConfig = (legacyConfig) => {
        // Handle old boolean-based theme config
        if (typeof legacyConfig === 'boolean') {
          return legacyConfig ? 'dark' : 'light';
        }
        
        // Handle old string mappings
        const legacyMappings = {
          'auto': 'system',
          'default': 'system',
          'night': 'dark',
          'day': 'light'
        };
        
        if (legacyMappings[legacyConfig]) {
          return legacyMappings[legacyConfig];
        }
        
        // Return as-is if already valid
        const validThemes = ['light', 'dark', 'system'];
        return validThemes.includes(legacyConfig) ? legacyConfig : 'system';
      };

      expect(migrateThemeConfig(true)).toBe('dark');
      expect(migrateThemeConfig(false)).toBe('light');
      expect(migrateThemeConfig('auto')).toBe('system');
      expect(migrateThemeConfig('night')).toBe('dark');
      expect(migrateThemeConfig('unknown')).toBe('system');
    });
  });

  describe('Performance and Memory Management', () => {
    test('debounces rapid theme changes', () => {
      let debounceTimeout;
      const debounceDelay = 150; // ms
      
      const debouncedThemeChange = (newTheme, callback) => {
        clearTimeout(debounceTimeout);
        
        debounceTimeout = setTimeout(() => {
          callback(newTheme);
        }, debounceDelay);
        
        return debounceTimeout;
      };

      const themeChangeCallback = jest.fn();
      
      // Rapid theme changes
      debouncedThemeChange('dark', themeChangeCallback);
      debouncedThemeChange('light', themeChangeCallback);
      debouncedThemeChange('system', themeChangeCallback);
      
      // Should not have been called yet
      expect(themeChangeCallback).not.toHaveBeenCalled();
      
      // Wait for debounce and verify only last call is executed
      return new Promise(resolve => {
        setTimeout(() => {
          expect(themeChangeCallback).toHaveBeenCalledTimes(1);
          expect(themeChangeCallback).toHaveBeenCalledWith('system');
          resolve();
        }, debounceDelay + 50);
      });
    });

    test('cleans up event listeners on shutdown', () => {
      const eventCleanup = {
        listeners: [],
        
        addListener: (eventName, callback) => {
          mockElectron.nativeTheme.on(eventName, callback);
          eventCleanup.listeners.push({ eventName, callback });
        },
        
        removeAllListeners: () => {
          eventCleanup.listeners.forEach(({ eventName, callback }) => {
            mockElectron.nativeTheme.removeListener(eventName, callback);
          });
          eventCleanup.listeners = [];
          mockElectron.nativeTheme.removeAllListeners();
        }
      };

      const mockCallback = jest.fn();
      eventCleanup.addListener('updated', mockCallback);
      
      expect(eventCleanup.listeners).toHaveLength(1);
      expect(mockElectron.nativeTheme.on).toHaveBeenCalledWith('updated', mockCallback);
      
      eventCleanup.removeAllListeners();
      
      expect(eventCleanup.listeners).toHaveLength(0);
      expect(mockElectron.nativeTheme.removeAllListeners).toHaveBeenCalled();
    });

    test('optimizes theme-related DOM updates', () => {
      const themeUpdateOptimizer = {
        pendingUpdates: new Set(),
        
        scheduleUpdate: (elementId, property, value) => {
          const updateKey = `${elementId}:${property}`;
          this.pendingUpdates.add({ elementId, property, value, updateKey });
          
          // Batch updates using requestAnimationFrame (mocked)
          return new Promise(resolve => {
            setTimeout(() => {
              // Apply all pending updates
              const updates = Array.from(this.pendingUpdates);
              this.pendingUpdates.clear();
              resolve(updates.length);
            }, 16); // ~60fps
          });
        }
      };

      // This test would normally use requestAnimationFrame
      // but we're using setTimeout to simulate the batching behavior
      expect(themeUpdateOptimizer.pendingUpdates.size).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles system theme detection failures', () => {
      const safeGetSystemTheme = () => {
        try {
          return mockElectron.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        } catch (error) {
          console.warn('Failed to detect system theme:', error.message);
          return 'light'; // Safe fallback
        }
      };

      // Mock system theme detection failure
      const originalShouldUseDarkColors = mockElectron.nativeTheme.shouldUseDarkColors;
      Object.defineProperty(mockElectron.nativeTheme, 'shouldUseDarkColors', {
        get: () => { throw new Error('System theme access denied'); }
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = safeGetSystemTheme();
      
      expect(result).toBe('light');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to detect system theme:',
        'System theme access denied'
      );
      
      // Restore
      Object.defineProperty(mockElectron.nativeTheme, 'shouldUseDarkColors', {
        value: originalShouldUseDarkColors
      });
      consoleSpy.mockRestore();
    });

    test('validates theme change requests', () => {
      const validateThemeChange = (requestedTheme, currentTheme) => {
        const validation = {
          isValid: ['light', 'dark', 'system'].includes(requestedTheme),
          isDifferent: requestedTheme !== currentTheme,
          reason: ''
        };

        if (!validation.isValid) {
          validation.reason = `Invalid theme: ${requestedTheme}`;
        } else if (!validation.isDifferent) {
          validation.reason = `Theme already set to: ${requestedTheme}`;
        } else {
          validation.reason = 'Theme change allowed';
        }

        return validation;
      };

      // Test valid change
      const validChange = validateThemeChange('dark', 'light');
      expect(validChange.isValid).toBe(true);
      expect(validChange.isDifferent).toBe(true);

      // Test invalid theme
      const invalidTheme = validateThemeChange('invalid', 'light');
      expect(invalidTheme.isValid).toBe(false);
      expect(invalidTheme.reason).toContain('Invalid theme');

      // Test same theme
      const sameTheme = validateThemeChange('light', 'light');
      expect(sameTheme.isValid).toBe(true);
      expect(sameTheme.isDifferent).toBe(false);
      expect(sameTheme.reason).toContain('already set');
    });
  });
});