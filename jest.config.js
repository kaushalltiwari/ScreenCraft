module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/renderer/**/*.js', // Exclude renderer process files for now
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds - Set realistic targets for files we actually test
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 15,
      lines: 20,
      statements: 20
    },
    // Specific thresholds for well-tested files
    'src/shared/ValidationUtils.js': {
      branches: 75,
      functions: 70,
      lines: 80,
      statements: 80
    },
    'src/shared/ErrorHandler.js': {
      branches: 60,
      functions: 75,
      lines: 75,
      statements: 75
    },
    'src/main/ConfigManager.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
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