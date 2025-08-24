const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API for settings window functionality
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings management
  getSettings: async () => {
    return await ipcRenderer.invoke('get-settings');
  },

  saveSettings: async (settings) => {
    return await ipcRenderer.invoke('save-settings', settings);
  },

  // Theme management
  getThemeInfo: async () => {
    return await ipcRenderer.invoke('get-theme-info');
  },

  setTheme: async (theme) => {
    return await ipcRenderer.invoke('set-theme', theme);
  },

  // Listen for settings data from main process
  onSettingsData: (callback) => {
    ipcRenderer.on('settings-data', (event, data) => {
      callback(data);
    });
  },

  // Listen for theme updates from main process
  onThemeUpdate: (callback) => {
    ipcRenderer.on('theme-update', (event, themeData) => {
      callback(themeData);
    });
  },

  // Close settings window
  closeSettings: () => {
    ipcRenderer.invoke('close-settings');
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

const { setupPreloadLogging } = require('../shared/preload-utils');

// Setup standard preload security logging
setupPreloadLogging('Settings');