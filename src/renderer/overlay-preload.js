const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API for overlay functionality
contextBridge.exposeInMainWorld('electronAPI', {
  // Process selection and trigger screenshot
  processSelection: async (selectionData) => {
    return await ipcRenderer.invoke('process-selection', selectionData);
  },

  // Close overlay window
  closeOverlay: () => {
    ipcRenderer.invoke('close-overlay');
  },

  // Listen for screen data from main process
  onScreensData: (callback) => {
    ipcRenderer.on('screens-captured', (event, data) => {
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
setupPreloadLogging('Overlay');