# Offline Screenshot Tool

A completely offline desktop screenshot tool built with Electron.js that provides fast, privacy-focused screen capture with enhanced annotation capabilities and comprehensive testing infrastructure.

![Screenshot Tool Demo](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)
![Electron](https://img.shields.io/badge/Electron-37.3.1-47848F)
![License](https://img.shields.io/badge/License-MIT-green)
![Offline](https://img.shields.io/badge/100%25-Offline-success)
![Tests](https://img.shields.io/badge/Tests-239%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-75%2B%25-brightgreen)
![Build Status](https://github.com/kaushalltiwari/ScreenCraft/actions/workflows/build.yml/badge.svg)

## 🚀 Features

### ✅ Current Implementation
- **Global Hotkey**: `Ctrl+Shift+S` for instant screenshot capture
- **System Tray Integration**: Click tray icon or use hotkey with context menu
- **Area Selection**: Click and drag to select rectangular screen areas
- **Multi-Monitor Support**: Automatically handles multiple displays
- **Instant Clipboard**: Screenshots automatically copied to clipboard
- **Enhanced Preview Window**: Feature-rich preview with annotation tools
- **Advanced Annotation System**: Shape tools, text annotations, and color customization
- **Unified Dropdown System**: Consistent UI components across all interfaces
- **Theme System**: Light/Dark/System theme support with real-time switching
- **Modular CSS Architecture**: Maintainable, organized stylesheets
- **Settings Window**: Comprehensive settings with customizable keyboard shortcuts
- **File Management**: Smart temporary file handling with auto-cleanup
- **File Path Access**: Copy file paths to clipboard for external tool integration
- **Comprehensive Testing**: 239 tests across unit, integration, e2e, and performance suites
- **100% Offline**: Zero network dependencies, all data stays local
- **Cross-Platform**: Works on Windows and macOS

### 🎨 Enhanced Annotation Features
- **Shape Drawing Tools**: Rectangle, circle, arrow, and line tools with customizable properties
- **Text Annotations**: Rich text with font family, size, styling, and background options
- **Advanced Color System**: Unified color palette with consistent styling across all tools
- **Smart UI Controls**: Responsive dropdowns with keyboard navigation and accessibility support
- **Copy Image**: Re-copy screenshot to clipboard (with or without annotations)
- **Copy Path**: Copy file path to clipboard for external tool integration
- **Save As**: Save to permanent location with file dialog
- **Undo/Clear**: Remove individual annotations or clear all modifications
- **Auto-cleanup**: Temporary files cleaned up on window close
- **Multiple Windows**: Support for multiple simultaneous screenshot previews

### ⌨️ Keyboard Shortcuts
- **Take Screenshot**: `Ctrl+Shift+S` (customizable)
- **Copy Image**: `Ctrl+V` (customizable)
- **Copy Path**: `Ctrl+Shift+V` (customizable)
- **Save**: `Ctrl+S` (customizable)
- **Toggle Borders**: `Ctrl+B` (customizable)
- **Undo Border**: `Ctrl+Z` (customizable)
- **Toggle Theme**: `Ctrl+T` (customizable)
- **Close Window**: `Escape` (customizable)

## 🛠️ Installation

### Download Pre-built Binaries
Get the latest release for your platform from the [Releases](../../releases) page:
- **Windows**: Download `.exe` installer 
- **macOS**: Download `.dmg` installer

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd ScreenCapture_clean

# Install dependencies
npm install

# Run tests (recommended before development)
npm test

# Run in development mode
npm run dev

# Or run in production mode
npm start
```

### Building Distributables
Cross-platform builds are automated via GitHub Actions. Every push to `main` triggers builds for both Windows and macOS.

**Local builds:**
```bash
# Setup build environment (creates icon placeholders)
npm run build:setup

# Build for current platform
npm run build

# Build for specific platforms
npm run build:win     # Windows installer (.exe)
npm run build:mac     # macOS installer (.dmg) - requires macOS
npm run build:all     # Both platforms
npm run build:portable # Windows portable app
```

Built installers will be created in the `/dist` directory.

## 🧪 Testing Infrastructure

### Comprehensive Test Suite
The application features a robust testing infrastructure with **239 tests** across multiple categories:

- **Unit Tests**: 17 test suites covering core components (ConfigManager, FileManager, ThemeManager, etc.)
- **Integration Tests**: Cross-component interaction testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Memory usage, file operations, and rendering performance

### Test Categories
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only  
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance benchmarks

# Run tests with coverage report
npm test -- --coverage
```

### Coverage & Quality
- **Coverage**: 75%+ across all testable modules
- **CI Integration**: All tests run on every commit via GitHub Actions
- **Cross-Platform**: Tests validated on Windows, macOS, and Linux environments
- **Electron Mocking**: Comprehensive mocking for Electron APIs and system integration

### Test Structure
```
tests/
├── unit/                 # Component-level testing
├── integration/          # Cross-component testing  
├── e2e/                  # End-to-end user workflows
├── performance/          # Performance benchmarking
└── setup.js             # Global test configuration
```

## 🎮 Usage

### Taking Screenshots
1. **Hotkey**: Press `Ctrl+Shift+S` anywhere on your system
2. **Tray Icon**: Click the screenshot tool icon in your system tray
3. **Selection**: Click and drag to select the area you want to capture
4. **Preview**: The preview window opens automatically with your screenshot

### Preview Window Features
- **Border Drawing**: Click the "Borders" button or press `Ctrl+B` to enter border mode
- **Color Selection**: Click the color picker dropdown to choose border colors
- **Drawing**: Click and drag to draw rectangular borders around areas of interest
- **Theme Toggle**: Click theme button or press `Ctrl+T` to cycle between light/dark/system themes
- **Multiple Actions**: Copy image, copy file path, or save with borders included

### System Tray Features
- **Click to Capture**: Single-click tray icon to start screenshot
- **Context Menu**: Right-click for options including Settings
- **Settings Window**: Access keyboard shortcut customization and theme preferences
- **Always Available**: App runs in background for instant access

## 🏗️ Architecture

### Modular Design
The application follows a clean, modular architecture with separation of concerns and comprehensive testing:

```
├── main.js                    # Main application controller
├── src/
│   ├── main/                 # Main process modules
│   │   ├── ScreenCaptureManager  # Screen capture and overlay management
│   │   ├── FileManager          # File operations and clipboard integration
│   │   ├── ConfigManager        # Settings and configuration management
│   │   ├── ThemeManager         # Theme system and preference handling
│   │   └── WindowManager        # Window lifecycle management
│   ├── renderer/             # Renderer process modules
│   │   ├── scripts/             # Modular JavaScript components
│   │   ├── styles/              # Organized CSS architecture
│   │   ├── overlay.html         # Fullscreen selection overlay
│   │   ├── preview.html         # Screenshot preview with annotations
│   │   ├── settings.html        # Settings window with theme and shortcuts
│   │   └── *-preload.js         # Secure IPC bridges for each renderer
│   └── shared/               # Shared utilities
│       ├── ErrorHandler.js     # Centralized error handling
│       ├── ValidationUtils.js   # Input validation and sanitization
│       ├── constants.js         # Centralized configuration
│       └── preload-utils.js     # Shared preload script utilities
└── tests/                    # Comprehensive test suite
    ├── unit/                 # Component-level testing
    ├── integration/          # Cross-component testing
    ├── e2e/                  # End-to-end workflows
    ├── performance/          # Performance benchmarking
    └── setup.js             # Global test configuration
```

### Key Components

**ScreenCaptureApp (main.js)**
- Main application controller with theme management
- Handles Electron lifecycle and IPC coordination
- Manages system tray, global shortcuts, and settings persistence
- Coordinates multiple preview windows and window lifecycle

**ScreenCaptureManager**
- Screen capture using Electron's `desktopCapturer`
- Overlay window management for area selection
- Multi-monitor support with combined display bounds
- App icon integration and display scaling

**FileManager**  
- Image processing with Jimp for cropping and border compositing
- Temporary file management with auto-cleanup
- Clipboard integration for images and file paths
- Save operations with user file dialogs

### Security Model
- Context isolation enabled in all renderer processes
- No node integration in renderer processes
- Secure IPC communication through contextBridge
- All file operations handled in main process

## 🔧 Technical Details

### Dependencies

**Production Dependencies:**
- **Electron**: Desktop app framework for cross-platform support
- **Jimp**: Image processing, cropping, and annotation rendering
- **uuid**: Unique filename generation for temporary files
- **temp**: Temporary file management with automatic cleanup
- **electron-log**: Local file-based logging with no external transmission

**Development Dependencies:**
- **Jest**: Testing framework with 239 comprehensive tests
- **JSDOM**: DOM environment simulation for integration testing
- **Various Mocks**: Comprehensive Electron API mocking for reliable testing

### Screen Capture Process
1. User triggers capture → `ScreenCaptureManager.startCapture()`
2. Capture all screens using `desktopCapturer.getSources()`
3. Create fullscreen overlay covering all displays
4. User selects area → coordinates sent via IPC
5. `ScreenCaptureManager.processSelection()` crops selected area
6. `FileManager.processScreenshot()` saves and copies to clipboard
7. Preview window displays with action buttons

### Multi-Monitor Support
- Detects all displays using `screen.getAllDisplays()`
- Calculates combined bounds for overlay positioning
- Handles high DPI displays with automatic scaling
- Selection coordinates mapped to correct display

### File Management
- Screenshots saved to OS-appropriate temp directories
- UUID-based filenames prevent conflicts
- Automatic cleanup when preview window closes
- Optional permanent save with user-chosen location


## 🚀 Recent Improvements

### v2.0 - Enhanced Test Suite & Architecture (Latest)
- **🧪 Comprehensive Testing**: Added 239 tests across unit, integration, e2e, and performance categories
- **🏗️ Modular CSS Architecture**: Reorganized stylesheets for maintainability and consistency
- **🎨 Advanced Annotation System**: Shape tools, text annotations with rich formatting options
- **🔧 Unified Dropdown System**: Consistent UI components with keyboard navigation support
- **⚡ Performance Optimizations**: Memory management improvements and faster file operations
- **🛡️ Enhanced Error Handling**: Centralized error management with comprehensive validation
- **🔄 Theme System Improvements**: Real-time theme switching with system preference detection
- **📊 CI/CD Integration**: Automated testing on every commit with cross-platform validation

### Quality Assurance Features
- **Test Coverage**: 75%+ coverage across all testable modules
- **GitHub Actions**: Automated builds and testing for Windows, macOS, and Linux
- **Electron Mocking**: Comprehensive API mocking for reliable cross-platform testing
- **Performance Benchmarking**: Memory usage tracking and file operation optimization
- **Error Recovery**: Graceful handling of system-level failures and user input edge cases

## 🛡️ Privacy & Security

### 100% Offline Operation
- **No Network Code**: Zero HTTP clients, APIs, or cloud services
- **Local Storage Only**: All data saved to local temp directories
- **No Telemetry**: No analytics, crash reporting, or external communication
- **Privacy First**: Screenshots never leave your machine

### Security Features
- Secure Electron configuration with context isolation
- No remote module access in renderer processes  
- Sandboxed renderer processes with limited API access
- All system operations handled in main process
- Comprehensive input validation and sanitization

## 📄 License

MIT License - see LICENSE file for details.

