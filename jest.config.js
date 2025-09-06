module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Test projects for different types of tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration', 
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 30000
    }
  ],
  
  // Coverage configuration - Only tested modules
  collectCoverageFrom: [
    // Only include main process files with unit tests
    'src/main/ConfigManager.js',
    // Shared modules that are unit tested
    'src/shared/ErrorHandler.js',
    'src/shared/ValidationUtils.js',
    // Exclude all non-tested files
    '!src/main/FileManager.js',      // Requires Electron environment
    '!src/main/ThemeManager.js',     // Requires Electron environment
    '!src/main/**',                  // All other main process files
    '!src/renderer/**',              // All renderer process files
    '!src/shared/constants.js',      // Constants file (no logic to test)
    '!src/shared/preload-utils.js',  // Preload utilities (require Electron)
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds - Match actual tested file coverage
  coverageThreshold: {
    global: {
      branches: 64,
      functions: 70, 
      lines: 75,
      statements: 75
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Transform files
  transform: {},
  
  // Test timeout
  testTimeout: 10000
};