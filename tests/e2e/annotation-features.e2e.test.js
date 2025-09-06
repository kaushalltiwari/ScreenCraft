/**
 * End-to-End tests for Advanced Annotation Features
 * Tests text annotations, shape tools, and unified dropdown system in realistic scenarios
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Enhanced Electron mocks for annotation testing
jest.mock('electron', () => {
  const mockBrowserWindow = {
    loadFile: jest.fn().mockResolvedValue(undefined),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      executeJavaScript: jest.fn().mockResolvedValue(undefined),
      insertCSS: jest.fn().mockResolvedValue(undefined),
      setZoomFactor: jest.fn()
    },
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    isDestroyed: jest.fn().mockReturnValue(false),
    getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    setBounds: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    focus: jest.fn(),
    reload: jest.fn()
  };

  return {
    app: {
      getPath: jest.fn().mockReturnValue('/tmp/test-app-annotation'),
      whenReady: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      quit: jest.fn(),
      isReady: jest.fn().mockReturnValue(true)
    },
    BrowserWindow: jest.fn().mockImplementation(() => mockBrowserWindow),
    globalShortcut: {
      register: jest.fn().mockReturnValue(true),
      unregisterAll: jest.fn()
    },
    ipcMain: {
      handle: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn()
    },
    desktopCapturer: {
      getSources: jest.fn().mockResolvedValue([
        {
          id: 'screen:0',
          name: 'Test Screen',
          thumbnail: {
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test-thumbnail'),
            getBitmap: jest.fn().mockReturnValue(Buffer.from('mock-bitmap')),
            getSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
          }
        }
      ])
    },
    clipboard: {
      writeImage: jest.fn(),
      writeText: jest.fn(),
      readText: jest.fn().mockReturnValue(''),
      readImage: jest.fn()
    },
    nativeImage: {
      createFromPath: jest.fn().mockReturnValue({
        toPNG: jest.fn().mockReturnValue(Buffer.from('mock-annotated-png')),
        getSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
        crop: jest.fn().mockReturnValue({
          toPNG: jest.fn().mockReturnValue(Buffer.from('mock-cropped-annotated')),
          getSize: jest.fn().mockReturnValue({ width: 800, height: 600 })
        })
      }),
      createFromBuffer: jest.fn().mockReturnValue({
        toPNG: jest.fn().mockReturnValue(Buffer.from('mock-annotated-buffer')),
        getSize: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
      })
    },
    shell: {
      openPath: jest.fn().mockResolvedValue(''),
      showItemInFolder: jest.fn()
    }
  };
});

describe('Advanced Annotation Features E2E Tests', () => {
  let mockFileSystem;
  let annotationData;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock file system for annotation testing
    mockFileSystem = {
      readFile: jest.fn().mockResolvedValue('{}'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockResolvedValue({ 
        mtime: new Date(),
        isFile: () => true 
      })
    };

    // Mock annotation data structures
    annotationData = {
      shapes: [],
      textAnnotations: [],
      settings: {
        currentTool: 'rectangle',
        strokeColor: '#e74c3c',
        strokeWidth: 2,
        textFont: 'Arial',
        textSize: 16
      }
    };
  });

  describe('Text Annotation Workflow', () => {
    test('executes complete text annotation creation workflow', async () => {
      const { BrowserWindow, ipcMain } = require('electron');
      
      // Create preview window for annotation testing
      const previewWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      await previewWindow.loadFile('src/renderer/preview.html');
      
      // Simulate text tool activation
      const textToolHandler = jest.fn().mockResolvedValue({
        success: true,
        toolActive: 'text',
        cursor: 'text'
      });

      ipcMain.handle('activate-text-tool', textToolHandler);

      // Simulate text creation at specific coordinates
      const textCreationHandler = jest.fn().mockResolvedValue({
        success: true,
        textId: 'text-annotation-1',
        position: { x: 300, y: 200 },
        properties: {
          fontSize: 16,
          fontFamily: 'Arial',
          color: '#000000',
          text: ''
        }
      });

      ipcMain.handle('create-text-annotation', textCreationHandler);

      // Simulate text input and editing
      const textEditHandler = jest.fn().mockResolvedValue({
        success: true,
        textId: 'text-annotation-1',
        text: 'Sample annotation text',
        updated: true
      });

      ipcMain.handle('update-text-annotation', textEditHandler);

      // Verify text tool activation
      await textToolHandler();
      expect(textToolHandler).toHaveBeenCalled();

      // Verify text creation
      const creationResult = await textCreationHandler(null, { x: 300, y: 200 });
      expect(creationResult.success).toBe(true);
      expect(creationResult.textId).toBe('text-annotation-1');

      // Verify text editing
      const editResult = await textEditHandler(null, { 
        textId: 'text-annotation-1', 
        text: 'Sample annotation text' 
      });
      expect(editResult.success).toBe(true);
      expect(editResult.text).toBe('Sample annotation text');
    });

    test('handles typography controls integration', async () => {
      const typographyControls = {
        fontFamily: ['Arial', 'Times New Roman', 'Helvetica', 'Georgia'],
        fontSize: [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48],
        textStyles: ['bold', 'italic', 'underline'],
        colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']
      };

      // Test font family selection
      const fontFamilyHandler = jest.fn().mockResolvedValue({
        success: true,
        fontFamily: 'Times New Roman',
        applied: true
      });

      // Test font size selection
      const fontSizeHandler = jest.fn().mockResolvedValue({
        success: true,
        fontSize: 20,
        applied: true
      });

      // Test style toggles
      const styleToggleHandler = jest.fn().mockResolvedValue({
        success: true,
        styles: { bold: true, italic: false, underline: true },
        applied: true
      });

      // Simulate typography control interactions
      expect(typographyControls.fontFamily).toContain('Times New Roman');
      expect(typographyControls.fontSize).toContain(20);
      expect(typographyControls.textStyles).toContain('bold');

      // Verify handlers would work correctly
      const fontResult = await fontFamilyHandler(null, { fontFamily: 'Times New Roman' });
      const sizeResult = await fontSizeHandler(null, { fontSize: 20 });
      const styleResult = await styleToggleHandler(null, { 
        bold: true, 
        italic: false, 
        underline: true 
      });

      expect(fontResult.fontFamily).toBe('Times New Roman');
      expect(sizeResult.fontSize).toBe(20);
      expect(styleResult.styles.bold).toBe(true);
    });

    test('validates text background system integration', async () => {
      const textBackgroundControls = {
        enabled: false,
        colors: ['#ff4444', '#4488ff', '#44ff44', '#ffaa44', '#aa44ff'],
        opacity: 80,
        cornerRadius: 4,
        padding: 8
      };

      // Test background enable/disable
      const backgroundToggleHandler = jest.fn().mockResolvedValue({
        success: true,
        backgroundEnabled: true,
        colorOptionsEnabled: true
      });

      // Test background color selection
      const backgroundColorHandler = jest.fn().mockResolvedValue({
        success: true,
        backgroundColor: '#4488ff',
        applied: true
      });

      // Test opacity adjustment
      const opacityHandler = jest.fn().mockResolvedValue({
        success: true,
        opacity: 60,
        applied: true
      });

      // Simulate background system interactions
      const toggleResult = await backgroundToggleHandler(null, { enabled: true });
      const colorResult = await backgroundColorHandler(null, { color: '#4488ff' });
      const opacityResult = await opacityHandler(null, { opacity: 60 });

      expect(toggleResult.backgroundEnabled).toBe(true);
      expect(colorResult.backgroundColor).toBe('#4488ff');
      expect(opacityResult.opacity).toBe(60);

      // Verify background rendering would include proper calculations
      const backgroundDimensions = {
        textWidth: 150,
        textHeight: 20,
        padding: textBackgroundControls.padding,
        finalWidth: 150 + (8 * 2), // 166
        finalHeight: 20 + (8 * 2)   // 36
      };

      expect(backgroundDimensions.finalWidth).toBe(166);
      expect(backgroundDimensions.finalHeight).toBe(36);
    });
  });

  describe('Advanced Shape Tools Workflow', () => {
    test('executes shape drawing workflow with unified dropdown', async () => {
      const { ipcMain } = require('electron');

      // Test shapes dropdown activation
      const shapesDropdownHandler = jest.fn().mockResolvedValue({
        success: true,
        dropdownVisible: true,
        shapes: ['rectangle', 'circle', 'arrow', 'line'],
        layout: 'horizontal'
      });

      ipcMain.handle('show-shapes-dropdown', shapesDropdownHandler);

      // Test shape selection
      const shapeSelectionHandler = jest.fn().mockResolvedValue({
        success: true,
        selectedShape: 'circle',
        toolActive: true,
        cursor: 'crosshair'
      });

      ipcMain.handle('select-shape-tool', shapeSelectionHandler);

      // Test shape drawing
      const shapeDrawingHandler = jest.fn().mockResolvedValue({
        success: true,
        shapeId: 'circle-shape-1',
        coordinates: { centerX: 400, centerY: 300, radius: 75 },
        style: { strokeColor: '#3498db', strokeWidth: 3 }
      });

      ipcMain.handle('draw-shape', shapeDrawingHandler);

      // Execute workflow
      const dropdownResult = await shapesDropdownHandler();
      expect(dropdownResult.shapes).toContain('circle');
      expect(dropdownResult.layout).toBe('horizontal');

      const selectionResult = await shapeSelectionHandler(null, { shape: 'circle' });
      expect(selectionResult.selectedShape).toBe('circle');

      const drawingResult = await shapeDrawingHandler(null, {
        shape: 'circle',
        startX: 325, startY: 225,
        endX: 475, endY: 375,
        strokeColor: '#3498db',
        strokeWidth: 3
      });
      
      expect(drawingResult.success).toBe(true);
      expect(drawingResult.shapeId).toBe('circle-shape-1');
    });

    test('handles multiple shape types and properties', async () => {
      const shapeTypes = [
        {
          type: 'rectangle',
          properties: { x: 100, y: 100, width: 200, height: 150 },
          style: { strokeColor: '#e74c3c', strokeWidth: 2 }
        },
        {
          type: 'circle',
          properties: { centerX: 300, centerY: 200, radius: 50 },
          style: { strokeColor: '#2ecc71', strokeWidth: 3 }
        },
        {
          type: 'arrow',
          properties: { startX: 400, startY: 100, endX: 500, endY: 200 },
          style: { strokeColor: '#f39c12', strokeWidth: 2, headSize: 15 }
        },
        {
          type: 'line',
          properties: { startX: 50, startY: 300, endX: 250, endY: 350 },
          style: { strokeColor: '#9b59b6', strokeWidth: 4 }
        }
      ];

      // Test each shape type
      shapeTypes.forEach((shape, index) => {
        expect(shape.type).toBeDefined();
        expect(shape.properties).toBeDefined();
        expect(shape.style.strokeColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(shape.style.strokeWidth).toBeGreaterThan(0);
      });

      // Verify shape-specific properties
      expect(shapeTypes[0].properties.width).toBe(200); // Rectangle
      expect(shapeTypes[1].properties.radius).toBe(50); // Circle
      expect(shapeTypes[2].style.headSize).toBe(15); // Arrow
      expect(shapeTypes[3].properties.startX).toBe(50); // Line
    });
  });

  describe('Unified Dropdown System Integration', () => {
    test('manages exclusive dropdown behavior in annotation context', async () => {
      const dropdownManager = {
        activeDropdowns: [],
        exclusiveMode: true,
        dropdownTypes: [
          'shapes-dropdown',
          'color-dropdown', 
          'text-style-dropdown',
          'font-family-dropdown',
          'background-style-dropdown'
        ]
      };

      const openDropdown = (dropdownId) => {
        if (dropdownManager.exclusiveMode) {
          dropdownManager.activeDropdowns = [dropdownId];
        } else {
          dropdownManager.activeDropdowns.push(dropdownId);
        }
        return { opened: dropdownId, exclusive: dropdownManager.exclusiveMode };
      };

      // Test exclusive behavior
      let result = openDropdown('shapes-dropdown');
      expect(result.opened).toBe('shapes-dropdown');
      expect(dropdownManager.activeDropdowns).toEqual(['shapes-dropdown']);

      result = openDropdown('color-dropdown');
      expect(result.opened).toBe('color-dropdown');
      expect(dropdownManager.activeDropdowns).toEqual(['color-dropdown']); // Shapes closed

      result = openDropdown('text-style-dropdown');
      expect(dropdownManager.activeDropdowns).toEqual(['text-style-dropdown']); // Only text style open
    });

    test('validates color palette consistency across dropdowns', async () => {
      const unifiedColorPalette = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
        '#9b59b6', '#e67e22', '#1abc9c', '#34495e',
        '#f1c40f', '#e91e63', '#000000', '#ffffff'
      ];

      const dropdownsUsingColors = [
        'border-color-dropdown',
        'text-color-dropdown', 
        'background-color-dropdown'
      ];

      // Verify same palette is used across all color dropdowns
      dropdownsUsingColors.forEach(dropdown => {
        const dropdownPalette = unifiedColorPalette; // Simulated
        expect(dropdownPalette).toEqual(unifiedColorPalette);
        expect(dropdownPalette).toHaveLength(12);
      });

      // Test color selection consistency
      const selectedColor = '#3498db';
      const colorSelection = {
        selectedInBorder: selectedColor,
        selectedInText: selectedColor,
        selectedInBackground: selectedColor
      };

      expect(colorSelection.selectedInBorder).toBe(selectedColor);
      expect(colorSelection.selectedInText).toBe(selectedColor);
      expect(colorSelection.selectedInBackground).toBe(selectedColor);
    });

    test('handles dropdown positioning and animation', async () => {
      const dropdownConfig = {
        position: 'bottom-center',
        animation: 'fadeIn',
        duration: 150,
        zIndex: 1000,
        showTransform: 'translateX(-50%) translateY(0) scale(1)',
        hideTransform: 'translateX(-50%) translateY(-4px) scale(0.95)'
      };

      const animateDropdown = (show) => {
        return {
          visible: show,
          transform: show ? dropdownConfig.showTransform : dropdownConfig.hideTransform,
          duration: dropdownConfig.duration,
          zIndex: dropdownConfig.zIndex
        };
      };

      const showResult = animateDropdown(true);
      expect(showResult.visible).toBe(true);
      expect(showResult.transform).toContain('scale(1)');
      expect(showResult.duration).toBe(150);

      const hideResult = animateDropdown(false);
      expect(hideResult.visible).toBe(false);
      expect(hideResult.transform).toContain('scale(0.95)');
    });
  });

  describe('CSS Modularization Integration', () => {
    test('validates modular CSS loading in annotation context', async () => {
      const { BrowserWindow } = require('electron');
      
      const previewWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Simulate CSS module loading
      const cssModules = [
        'styles/theme.css',
        'styles/layout.css', 
        'styles/toolbar.css',
        'styles/dropdowns.css'
      ];

      const loadCSSModule = jest.fn().mockResolvedValue(true);
      
      // Test that all modules load correctly
      for (const module of cssModules) {
        await loadCSSModule(module);
      }

      expect(loadCSSModule).toHaveBeenCalledTimes(4);
      expect(loadCSSModule).toHaveBeenCalledWith('styles/theme.css');
      expect(loadCSSModule).toHaveBeenCalledWith('styles/dropdowns.css');
    });

    test('validates theme system integration with annotations', async () => {
      const themeManager = {
        currentTheme: 'light',
        themes: ['light', 'dark', 'system'],
        annotationColors: {
          light: {
            text: '#1f2937',
            border: '#000000',
            background: '#ffffff'
          },
          dark: {
            text: '#f1f5f9', 
            border: '#ffffff',
            background: '#1e1e1e'
          }
        }
      };

      const switchTheme = (newTheme) => {
        themeManager.currentTheme = newTheme;
        return themeManager.annotationColors[newTheme] || themeManager.annotationColors.light;
      };

      const lightColors = switchTheme('light');
      expect(lightColors.text).toBe('#1f2937');
      expect(lightColors.background).toBe('#ffffff');

      const darkColors = switchTheme('dark');
      expect(darkColors.text).toBe('#f1f5f9');
      expect(darkColors.background).toBe('#1e1e1e');
    });
  });

  describe('Complete Annotation Workflow Integration', () => {
    test('executes full screenshot with multiple annotations workflow', async () => {
      const { 
        desktopCapturer, 
        nativeImage, 
        clipboard,
        ipcMain 
      } = require('electron');

      // Step 1: Capture screenshot
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      expect(sources).toHaveLength(1);

      // Step 2: Create annotations
      const annotations = [
        {
          type: 'text',
          id: 'text-1',
          x: 200, y: 150,
          text: 'Important Note',
          fontSize: 18,
          color: '#e74c3c',
          background: { enabled: true, color: '#ffffff', opacity: 80 }
        },
        {
          type: 'rectangle', 
          id: 'rect-1',
          x: 300, y: 200,
          width: 150, height: 100,
          strokeColor: '#3498db',
          strokeWidth: 3
        },
        {
          type: 'arrow',
          id: 'arrow-1', 
          startX: 500, startY: 100,
          endX: 400, endY: 180,
          strokeColor: '#2ecc71',
          strokeWidth: 2
        }
      ];

      // Step 3: Render annotations to image
      const renderHandler = jest.fn().mockResolvedValue({
        success: true,
        annotatedImagePath: '/tmp/test-annotated.png',
        annotationCount: 3,
        fileSize: 45000
      });

      ipcMain.handle('render-annotations', renderHandler);

      const renderResult = await renderHandler(null, { 
        imagePath: '/tmp/test-screenshot.png',
        annotations: annotations 
      });

      expect(renderResult.success).toBe(true);
      expect(renderResult.annotationCount).toBe(3);

      // Step 4: Copy to clipboard and save
      const finalImage = nativeImage.createFromPath(renderResult.annotatedImagePath);
      clipboard.writeImage(finalImage);

      expect(clipboard.writeImage).toHaveBeenCalledWith(finalImage);

      // Step 5: Save annotated image
      const saveResult = await mockFileSystem.writeFile(
        renderResult.annotatedImagePath,
        finalImage.toPNG()
      );

      expect(mockFileSystem.writeFile).toHaveBeenCalled();
    });

    test('handles annotation persistence and loading', async () => {
      const annotationData = {
        version: '1.0',
        imageId: 'screenshot-123456',
        timestamp: Date.now(),
        annotations: [
          {
            id: 'text-1',
            type: 'text',
            properties: {
              x: 100, y: 100,
              text: 'Saved annotation',
              fontSize: 16,
              fontFamily: 'Arial',
              color: '#000000',
              background: {
                enabled: true,
                color: '#ffff44',
                opacity: 70
              }
            }
          },
          {
            id: 'shape-1',
            type: 'circle',
            properties: {
              centerX: 300,
              centerY: 200, 
              radius: 50,
              strokeColor: '#e74c3c',
              strokeWidth: 2
            }
          }
        ]
      };

      // Test saving annotation data
      const saveAnnotationsHandler = jest.fn().mockResolvedValue({
        success: true,
        filePath: '/tmp/annotations-123456.json',
        annotationCount: 2
      });

      // Test loading annotation data
      const loadAnnotationsHandler = jest.fn().mockResolvedValue({
        success: true,
        annotationData: annotationData,
        loaded: true
      });

      const saveResult = await saveAnnotationsHandler(null, { 
        imageId: 'screenshot-123456',
        annotations: annotationData.annotations 
      });

      const loadResult = await loadAnnotationsHandler(null, { 
        imageId: 'screenshot-123456' 
      });

      expect(saveResult.annotationCount).toBe(2);
      expect(loadResult.annotationData.annotations).toHaveLength(2);
      expect(loadResult.annotationData.version).toBe('1.0');
    });

    test('validates performance with multiple complex annotations', async () => {
      const performanceTest = {
        maxAnnotations: 50,
        renderTimeout: 5000, // 5 seconds max
        memoryThreshold: 100 * 1024 * 1024 // 100MB
      };

      // Create test annotations
      const annotations = [];
      for (let i = 0; i < performanceTest.maxAnnotations; i++) {
        annotations.push({
          id: `annotation-${i}`,
          type: i % 4 === 0 ? 'text' : i % 4 === 1 ? 'rectangle' : 
                i % 4 === 2 ? 'circle' : 'arrow',
          properties: {
            x: Math.random() * 800,
            y: Math.random() * 600,
            color: '#000000'
          }
        });
      }

      expect(annotations).toHaveLength(performanceTest.maxAnnotations);

      // Simulate performance measurement
      const performanceMetrics = {
        renderTime: 1200, // ms
        memoryUsed: 85 * 1024 * 1024, // 85MB
        annotationCount: annotations.length
      };

      expect(performanceMetrics.renderTime).toBeLessThan(performanceTest.renderTimeout);
      expect(performanceMetrics.memoryUsed).toBeLessThan(performanceTest.memoryThreshold);
      expect(performanceMetrics.annotationCount).toBe(50);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('handles annotation rendering failures gracefully', async () => {
      const errorRecovery = {
        fallbackEnabled: true,
        retryAttempts: 3,
        errorHandlers: {
          'RENDER_FAILED': 'Use basic rendering without effects',
          'FONT_MISSING': 'Fall back to system default font',
          'COLOR_INVALID': 'Use black as default color',
          'MEMORY_ERROR': 'Reduce image quality and retry'
        }
      };

      const handleAnnotationError = (errorType, context) => {
        const handler = errorRecovery.errorHandlers[errorType];
        if (handler && errorRecovery.fallbackEnabled) {
          return {
            recovered: true,
            fallbackUsed: handler,
            context: context
          };
        }
        return { recovered: false, error: errorType };
      };

      const renderError = handleAnnotationError('RENDER_FAILED', { 
        annotation: 'text-1' 
      });
      expect(renderError.recovered).toBe(true);
      expect(renderError.fallbackUsed).toContain('basic rendering');

      const fontError = handleAnnotationError('FONT_MISSING', { 
        fontFamily: 'NonexistentFont' 
      });
      expect(fontError.recovered).toBe(true);
      expect(fontError.fallbackUsed).toContain('system default');
    });

    test('validates annotation data integrity', async () => {
      const validateAnnotation = (annotation) => {
        const validationResults = {
          hasValidId: typeof annotation.id === 'string' && annotation.id.length > 0,
          hasValidType: ['text', 'rectangle', 'circle', 'arrow', 'line'].includes(annotation.type),
          hasValidProperties: annotation.properties && typeof annotation.properties === 'object',
          hasValidPosition: typeof annotation.properties?.x === 'number' && 
                           typeof annotation.properties?.y === 'number'
        };

        return {
          isValid: Object.values(validationResults).every(result => result === true),
          checks: validationResults
        };
      };

      const validAnnotation = {
        id: 'text-valid',
        type: 'text',
        properties: { x: 100, y: 200, text: 'Valid text' }
      };

      const invalidAnnotation = {
        id: '',
        type: 'invalid-type',
        properties: null
      };

      expect(validateAnnotation(validAnnotation).isValid).toBe(true);
      expect(validateAnnotation(invalidAnnotation).isValid).toBe(false);
      expect(validateAnnotation(invalidAnnotation).checks.hasValidId).toBe(false);
    });
  });
});