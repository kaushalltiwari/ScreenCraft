# Enhanced Test Suite

This directory contains a comprehensive test suite covering all recent feature changes and improvements to the Screenshot Tool application.

## Test Structure

### Unit Tests (`tests/unit/`)
- **TextAnnotationSystem.test.js** - Tests for Inkscape-style text functionality
- **ShapeToolSystem.test.js** - Advanced shape drawing tools (Rectangle, Circle, Arrow, Line)  
- **UnifiedDropdownSystem.test.js** - Unified dropdown framework with exclusive behavior
- **CSSModularization.test.js** - CSS module structure and dependency validation
- **FileManager.test.js** - Image processing, annotation rendering, clipboard operations
- **ThemeManager.test.js** - Theme switching and system theme detection

### Integration Tests (`tests/integration/`)
- **ui-components.integration.test.js** - Complete UI component integration with JSDOM

### End-to-End Tests (`tests/e2e/`)
- **annotation-features.e2e.test.js** - Complete annotation workflows and performance

### Performance Tests (`tests/performance/`)
- **annotation-performance.test.js** - Performance benchmarks for annotation operations
- **file-operations.test.js** - File system and image processing performance

## Test Coverage

The enhanced test suite covers:

### Recent Feature Additions
- ✅ **Text Annotation System**: Typography controls, background rectangles, canvas integration
- ✅ **Advanced Shape Tools**: Rectangle, Circle, Arrow, and Line drawing with interaction detection
- ✅ **Unified Dropdown System**: Exclusive dropdown behavior and color picker integration
- ✅ **CSS Modularization**: Theme system, layout management, and browser caching
- ✅ **File Management**: Jimp integration, annotation rendering, clipboard operations
- ✅ **Theme Management**: Light/dark/system themes with CSS variable support

### Testing Categories
- **Unit Tests**: Individual component functionality and logic
- **Integration Tests**: Component interaction and system integration
- **End-to-End Tests**: Complete user workflows and feature scenarios
- **Performance Tests**: Speed benchmarks and memory usage validation

## Running Tests

### Individual Test Categories
```bash
# Run unit tests only
npm run test:unit

# Run integration tests only  
npm run test:integration

# Run end-to-end tests only
npm run test:e2e

# Run performance tests only
npm run test:performance
```

### Comprehensive Testing
```bash
# Run all test categories
npm run test:all

# Run all tests with coverage
npm run test:coverage

# Run in watch mode for development
npm run test:watch

# CI/CD pipeline tests
npm run test:ci
```

### Selective Testing
```bash
# Run specific test file
npm test -- tests/unit/TextAnnotationSystem.test.js

# Run tests matching pattern
npm test -- --testNamePattern="text annotation"

# Run with verbose output
npm test -- --verbose
```

## Performance Benchmarks

The performance tests establish benchmarks for:

### Annotation Operations
- **Shape Drawing**: 100 rectangles/circles within 100ms
- **Text Rendering**: 50 text annotations within 100ms  
- **Mouse Events**: 1000 mouse movements within 50ms
- **Canvas Operations**: Large area clears within 50ms

### File Operations
- **Image Processing**: 4K image processing within 1 second
- **Batch Processing**: 10 images resized within 2 seconds
- **File System**: 20 screenshots saved within 1 second
- **Cleanup**: 50 temporary files deleted within 500ms

### Memory Management
- **Annotation Storage**: 1000 annotations under 10MB memory increase
- **Image Processing**: Proper resource cleanup after batch operations
- **Event Listeners**: Complete cleanup verification

## Test Configuration

### Jest Configuration
- **Projects**: Separate configurations for unit, integration, e2e, and performance tests
- **Environments**: Node.js for most tests, JSDOM for integration tests
- **Timeouts**: Extended timeouts (30s) for performance tests
- **Coverage**: 70% branches, 75% functions, 80% lines/statements

### Mock Strategy
- **Electron APIs**: Comprehensive mocking for cross-platform compatibility
- **File System**: Safe mocking for file operations without actual I/O
- **Image Processing**: Jimp mocking for consistent test environments
- **Canvas Context**: Complete 2D context mocking for drawing operations

## Coverage Targets

### Global Coverage Goals
- **Branches**: 70% minimum coverage
- **Functions**: 75% minimum coverage  
- **Lines**: 80% minimum coverage
- **Statements**: 80% minimum coverage

### Critical Component Coverage
- Text annotation system: 85%+ coverage
- Shape drawing tools: 90%+ coverage
- File management: 80%+ coverage
- Theme management: 85%+ coverage
- CSS modularization: 75%+ coverage

## Adding New Tests

### Test File Naming
- Unit tests: `ComponentName.test.js`
- Integration tests: `feature-name.integration.test.js`
- E2E tests: `workflow-name.e2e.test.js`
- Performance tests: `category-performance.test.js`

### Test Structure
```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  describe('specific functionality', () => {
    test('should perform expected behavior', () => {
      // Test implementation
    });
  });
});
```

### Mock Utilities
Use global utilities from `tests/setup.js`:
- `createMockCanvasContext()` - Canvas 2D context mock
- `createMockCanvas()` - Complete canvas element mock
- `measurePerformance(fn)` - Performance timing utility
- `measureAsyncPerformance(fn)` - Async performance timing

## Continuous Integration

### Pre-commit Checks
- All tests must pass before commit
- Coverage thresholds must be maintained
- No new untested code allowed

### Pipeline Integration
- `npm run test:ci` for CI environments
- Coverage reports generated for all test runs
- Performance regression detection
- Cross-platform test execution

## Troubleshooting

### Common Issues
1. **JSDOM Setup**: Integration tests require proper DOM environment setup
2. **Mock Conflicts**: Ensure mocks don't interfere between test categories
3. **Performance Variability**: Performance tests may vary on different hardware
4. **File System**: Temporary file cleanup may require manual intervention

### Debug Commands
```bash
# Run tests with debug output
npm test -- --verbose --no-coverage

# Run single test in isolation  
npm test -- --testPathPattern="specific-test.js" --verbose

# Generate detailed coverage report
npm run test:coverage -- --coverageReporters=html
```

## Maintenance

### Regular Updates
- Review and update performance benchmarks quarterly
- Add tests for new features immediately upon implementation
- Maintain mock compatibility with Electron API updates
- Update coverage targets as codebase matures

### Test Quality
- Ensure tests are deterministic and reliable
- Avoid dependencies between test cases
- Keep test data fixtures up to date
- Regular mock validation against real APIs