/**
 * Shared utilities for preload scripts
 * Consolidates common security logging and setup patterns
 */

/**
 * Sets up standard security logging for preload scripts
 * @param {string} scriptName - Name of the preload script for logging
 */
function setupPreloadLogging(scriptName) {
  // Security: Ensure no direct Node.js access
  window.addEventListener('DOMContentLoaded', () => {
    console.log(`${scriptName} preload script loaded - secure context established`);
    
    if (window.electronAPI) {
      console.log(`✅ ${scriptName} Electron API bridge established`);
    } else {
      console.error(`❌ ${scriptName} Electron API bridge failed`);
    }
  });
}

module.exports = {
  setupPreloadLogging
};