# Offline Screenshot Tool

A completely offline desktop screenshot tool built with Electron.js that provides fast, privacy-focused screen capture with seamless Claude Code integration.

![Screenshot Tool Demo](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)
![Electron](https://img.shields.io/badge/Electron-37.3.1-47848F)
![License](https://img.shields.io/badge/License-MIT-green)
![Offline](https://img.shields.io/badge/100%25-Offline-success)
![Build Status](https://github.com/kaushalltiwari/ScreenCraft/actions/workflows/build.yml/badge.svg)

## 🚀 Features

### ✅ Current Implementation
- **Global Hotkey**: `Ctrl+Shift+S` for instant screenshot capture
- **System Tray Integration**: Click tray icon or use hotkey with context menu
- **Area Selection**: Click and drag to select rectangular screen areas
- **Multi-Monitor Support**: Automatically handles multiple displays
- **Instant Clipboard**: Screenshots automatically copied to clipboard
- **Enhanced Preview Window**: Feature-rich preview with annotation tools
- **Border Drawing**: Interactive border annotation with color picker
- **Theme System**: Light/Dark/System theme support with real-time switching
- **Settings Window**: Comprehensive settings with customizable keyboard shortcuts
- **File Management**: Smart temporary file handling with auto-cleanup
- **Claude Code Integration**: Copy file paths for direct use in Claude Code
- **100% Offline**: Zero network dependencies, all data stays local
- **Cross-Platform**: Works on Windows and macOS

### 🎨 Enhanced Preview Features
- **Copy Image**: Re-copy screenshot to clipboard (with or without borders)
- **Copy Path**: Copy file path to clipboard for Claude Code usage
- **Save As**: Save to permanent location with file dialog
- **Border Tool**: Draw colored borders and annotations on screenshots
- **Color Picker**: Choose from 12 predefined colors for border drawing
- **Undo/Clear**: Remove individual borders or clear all annotations
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
The application follows a clean, modular architecture with separation of concerns:

```
├── main.js                    # Main application controller
├── src/main/
│   ├── ScreenCaptureManager   # Screen capture and overlay management
│   └── FileManager           # File operations and clipboard integration
├── src/renderer/
│   ├── overlay.html          # Fullscreen selection overlay
│   ├── preview.html          # Screenshot preview with annotation tools
│   ├── settings.html         # Settings window with theme and shortcuts
│   └── *-preload.js          # Secure IPC bridges for each renderer
└── src/shared/
    ├── constants.js          # Centralized configuration
    └── preload-utils.js      # Shared preload script utilities
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
- **Electron**: Desktop app framework
- **Jimp**: Image processing and cropping
- **uuid**: Unique filename generation
- **temp**: Temporary file management with tracking
- **electron-log**: Local file-based logging

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

## 🎯 Claude Code Integration

This tool is specifically designed for seamless Claude Code workflows:

1. **Auto-Clipboard**: Screenshots immediately available for pasting
2. **File Path Copy**: Get absolute file paths for direct Claude Code usage
3. **Temporary Persistence**: Files remain available until window close
4. **Offline Operation**: No network dependencies, complete privacy

### Usage with Claude Code
1. Take screenshot using `Ctrl+Shift+S`
2. Image is automatically in clipboard - paste directly into Claude Code
3. Or click "Copy Path" to get file path for Claude Code file operations
4. Files auto-cleanup when done, maintaining privacy

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

## 📦 Automated Builds

### GitHub Actions CI/CD
This repository uses GitHub Actions for automated cross-platform builds:

- **Trigger**: Every push to `main` branch
- **Platforms**: Windows and macOS builds run in parallel
- **Artifacts**: Installers automatically uploaded to GitHub Releases
- **Workflow**: See `.github/workflows/` for build configuration

### Build Requirements

#### Custom Icons (Required for Distribution)
Add these files to `/assets/` directory:
- `icon.ico` - Windows icon (256x256 with multiple sizes)
- `icon.icns` - macOS icon (1024x1024 with Retina support)

See `assets/ICON-SETUP.md` for detailed icon creation instructions.

#### Platform-Specific Notes
- **Windows**: Creates NSIS installer with desktop shortcuts
- **macOS**: Creates DMG with drag-to-Applications
- **Permissions**: macOS may require screen recording permissions
- **Code Signing**: GitHub Actions can be configured with signing certificates

## 🔮 Future Roadmap

### Stage 2: Enhanced Capture Modes
- Full screen capture (`Ctrl+Shift+F`)
- Freeform selection with custom shapes  
- Window selection mode
- Enhanced multi-monitor controls

### Stage 3: Screen Recording
- Video recording with area selection
- System audio and microphone capture
- Recording controls with floating panel
- MP4/WebM format support

## 🤝 Development

### Project Status
**Current**: Stage 1+ Complete ✅
- All core screenshot functionality implemented and polished
- System tray and global hotkey working with settings integration
- Multi-monitor support functional with display scaling
- Enhanced preview window with border annotation tools complete
- Theme system with light/dark/system modes implemented
- Settings window with customizable keyboard shortcuts
- Claude Code integration ready with file path copying
- Icon system with programmatic generation and SVG assets

### Contributing
This is a privacy-focused, offline-only project. Contributions should maintain:
- Zero network dependencies
- Local-only file operations  
- Cross-platform compatibility
- Clean modular architecture

### Code Style
- ES6+ JavaScript with async/await
- Modular class-based architecture
- Comprehensive error handling
- Electron security best practices

## 📄 License

MIT License - see LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

**Global Shortcut Not Working**
- Check if another app is using `Ctrl+Shift+S`
- Try running as administrator (Windows) or check accessibility permissions (macOS)

**Black Screenshot/No Overlay**
- Check screen recording permissions on macOS
- Ensure no fullscreen apps are blocking overlay

**Build Fails**
- Run `npm run build:setup` first to create required assets
- Add custom icons to `/assets/` directory
- Check Node.js version (requires 18+)

**Preview Window Not Opening** 
- Check temp directory permissions
- Look in electron logs for error details
- Verify image processing dependencies installed

**Settings Window Issues**
- Try right-clicking system tray icon to access settings
- Check if settings file has correct permissions in user data directory
- Reset settings by deleting app settings file in user data folder

**Border Drawing Not Working**
- Make sure you're in border mode (click Borders button or press Ctrl+B)
- Check that you're drawing outside the toolbar area
- Try right-clicking in border mode to access color picker

**Theme Not Changing**
- Check system theme settings if using "System" theme mode
- Try manually selecting Light or Dark theme from settings
- Restart application if theme appears stuck

### Debug Mode
```bash
npm run dev  # Runs with developer tools open
```

### Logs
Application logs are stored locally using electron-log:
- **Windows**: `%USERPROFILE%\AppData\Roaming\offline-screenshot-tool\logs\`
- **macOS**: `~/Library/Logs/offline-screenshot-tool/`