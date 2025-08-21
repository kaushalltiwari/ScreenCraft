const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API for preview window functionality
contextBridge.exposeInMainWorld('electronAPI', {
  // Handle action buttons in preview
  previewAction: async (actionData) => {
    return await ipcRenderer.invoke('preview-action', actionData);
  },

  // Close preview window
  closePreview: () => {
    ipcRenderer.invoke('close-preview');
  },

  // Get information about all open preview windows
  getOpenWindows: async () => {
    return await ipcRenderer.invoke('get-open-windows');
  },

  // Listen for screenshot data from main process
  onScreenshotData: (callback) => {
    ipcRenderer.on('screenshot-data', (event, data) => {
      callback(data);
    });
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

const { setupPreloadLogging } = require('../shared/preload-utils');

// Setup standard preload security logging
setupPreloadLogging('Preview');