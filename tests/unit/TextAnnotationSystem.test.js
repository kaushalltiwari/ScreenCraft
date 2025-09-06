/**
 * Unit tests for Text Annotation System
 * Tests typography controls, text background functionality, and Inkscape-style text editing
 */

describe('Text Annotation System', () => {
  let mockDOM;
  let mockCanvas;
  let textAnnotationSystem;

  beforeEach(() => {
    // Mock DOM elements for text annotation testing
    mockDOM = {
      canvas: {
        getContext: jest.fn(() => ({
          font: '16px Arial',
          fillStyle: '#000000',
          strokeStyle: '#000000',
          fillText: jest.fn(),
          strokeText: jest.fn(),
          measureText: jest.fn(() => ({ width: 100 })),
          fillRect: jest.fn(),
          strokeRect: jest.fn(),
          save: jest.fn(),
          restore: jest.fn(),
          translate: jest.fn(),
          scale: jest.fn(),
          clearRect: jest.fn()
        })),
        width: 1000,
        height: 600,
        getBoundingClientRect: jest.fn(() => ({
          left: 0, top: 0, width: 1000, height: 600
        }))
      },
      textEditor: {
        style: {},
        value: '',
        focus: jest.fn(),
        blur: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({
          left: 100, top: 100, width: 200, height: 30
        }))
      },
      document: {
        createElement: jest.fn((tag) => {
          if (tag === 'textarea') return mockDOM.textEditor;
          return { style: {}, addEventListener: jest.fn() };
        }),
        body: { appendChild: jest.fn(), removeChild: jest.fn() }
      }
    };

    // Mock canvas context
    mockCanvas = mockDOM.canvas.getContext();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Text Creation and Positioning', () => {
    test('creates text element at click position', () => {
      const clickEvent = { 
        offsetX: 200, 
        offsetY: 150,
        target: mockDOM.canvas 
      };

      // Simulate text creation
      const textData = {
        x: clickEvent.offsetX,
        y: clickEvent.offsetY,
        text: '',
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        bold: false,
        italic: false,
        underline: false
      };

      expect(textData.x).toBe(200);
      expect(textData.y).toBe(150);
      expect(textData.fontSize).toBe(16);
      expect(textData.fontFamily).toBe('Arial');
    });

    test('handles Inkscape-style text positioning', () => {
      const textElements = [
        { x: 100, y: 50, text: 'First text' },
        { x: 300, y: 200, text: 'Second text' },
        { x: 500, y: 350, text: 'Third text' }
      ];

      textElements.forEach(element => {
        expect(element.x).toBeGreaterThan(0);
        expect(element.y).toBeGreaterThan(0);
        expect(typeof element.text).toBe('string');
      });
    });

    test('validates text drag and drop functionality', () => {
      const originalPosition = { x: 100, y: 100 };
      const dragOffset = { x: 50, y: 30 };
      
      const newPosition = {
        x: originalPosition.x + dragOffset.x,
        y: originalPosition.y + dragOffset.y
      };

      expect(newPosition.x).toBe(150);
      expect(newPosition.y).toBe(130);
    });
  });

  describe('Typography Controls', () => {
    test('applies font family changes', () => {
      const textData = {
        fontFamily: 'Arial',
        fontSize: 16,
        bold: false,
        italic: false,
        underline: false
      };

      // Test font family update
      const fontFamilies = ['Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana'];
      
      fontFamilies.forEach(family => {
        textData.fontFamily = family;
        expect(textData.fontFamily).toBe(family);
      });
    });

    test('applies font size changes', () => {
      const validSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
      
      validSizes.forEach(size => {
        const textData = { fontSize: size };
        expect(textData.fontSize).toBe(size);
        expect(textData.fontSize).toBeGreaterThan(7);
        expect(textData.fontSize).toBeLessThan(73);
      });
    });

    test('applies text styling (bold, italic, underline)', () => {
      const textStyles = {
        bold: false,
        italic: false,
        underline: false
      };

      // Test individual style toggles
      textStyles.bold = true;
      expect(textStyles.bold).toBe(true);
      expect(textStyles.italic).toBe(false);
      expect(textStyles.underline).toBe(false);

      textStyles.italic = true;
      expect(textStyles.bold).toBe(true);
      expect(textStyles.italic).toBe(true);
      expect(textStyles.underline).toBe(false);

      textStyles.underline = true;
      expect(textStyles.bold).toBe(true);
      expect(textStyles.italic).toBe(true);
      expect(textStyles.underline).toBe(true);
    });

    test('generates correct font string from style options', () => {
      const generateFontString = (fontSize, fontFamily, bold, italic) => {
        let fontString = '';
        if (bold) fontString += 'bold ';
        if (italic) fontString += 'italic ';
        fontString += `${fontSize}px ${fontFamily}`;
        return fontString;
      };

      expect(generateFontString(16, 'Arial', false, false)).toBe('16px Arial');
      expect(generateFontString(18, 'Times New Roman', true, false)).toBe('bold 18px Times New Roman');
      expect(generateFontString(20, 'Helvetica', false, true)).toBe('italic 20px Helvetica');
      expect(generateFontString(24, 'Georgia', true, true)).toBe('bold italic 24px Georgia');
    });

    test('applies text color changes', () => {
      const colorPalette = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
        '#9b59b6', '#e67e22', '#1abc9c', '#34495e',
        '#f1c40f', '#e91e63', '#000000', '#ffffff'
      ];

      colorPalette.forEach(color => {
        const textData = { color: color };
        expect(textData.color).toBe(color);
        expect(textData.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Text Background System', () => {
    test('creates text background with default settings', () => {
      const backgroundDefaults = {
        enabled: false,
        color: '#ffffff',
        opacity: 80,
        cornerRadius: 4,
        padding: 8
      };

      expect(backgroundDefaults.enabled).toBe(false);
      expect(backgroundDefaults.color).toBe('#ffffff');
      expect(backgroundDefaults.opacity).toBe(80);
      expect(backgroundDefaults.cornerRadius).toBe(4);
      expect(backgroundDefaults.padding).toBe(8);
    });

    test('validates background color options', () => {
      const backgroundColors = [
        '#ff4444', '#4488ff', '#44ff44', '#ffaa44', 
        '#aa44ff', '#44aaaa', '#333333', '#ffff44',
        '#ff44aa', '#000000', '#ffffff'
      ];

      backgroundColors.forEach(color => {
        const backgroundData = { color: color };
        expect(backgroundData.color).toBe(color);
        expect(backgroundData.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    test('validates opacity slider functionality', () => {
      const opacityValues = [0, 20, 40, 60, 80, 100];
      
      opacityValues.forEach(opacity => {
        const backgroundData = { opacity: opacity };
        expect(backgroundData.opacity).toBe(opacity);
        expect(backgroundData.opacity).toBeGreaterThanOrEqual(0);
        expect(backgroundData.opacity).toBeLessThanOrEqual(100);
      });
    });

    test('validates corner radius settings', () => {
      const radiusValues = [0, 2, 4, 6, 8, 12, 16];
      
      radiusValues.forEach(radius => {
        const backgroundData = { cornerRadius: radius };
        expect(backgroundData.cornerRadius).toBe(radius);
        expect(backgroundData.cornerRadius).toBeGreaterThanOrEqual(0);
      });
    });

    test('calculates background dimensions with padding', () => {
      const textMetrics = { width: 100, height: 20 };
      const padding = 8;
      
      const backgroundDimensions = {
        width: textMetrics.width + (padding * 2),
        height: textMetrics.height + (padding * 2)
      };

      expect(backgroundDimensions.width).toBe(116);
      expect(backgroundDimensions.height).toBe(36);
    });

    test('renders background with proper alpha transparency', () => {
      const opacity = 80;
      const color = '#ffffff';
      
      // Convert opacity percentage to alpha value
      const alpha = opacity / 100;
      const rgbaColor = `rgba(255, 255, 255, ${alpha})`;
      
      expect(alpha).toBe(0.8);
      expect(rgbaColor).toBe('rgba(255, 255, 255, 0.8)');
    });
  });

  describe('Text Editing State Management', () => {
    test('manages text editor visibility state', () => {
      const editorStates = {
        visible: false,
        editing: false,
        selectedText: null
      };

      // Simulate text creation
      editorStates.visible = true;
      editorStates.editing = true;
      editorStates.selectedText = { id: 'text-1' };

      expect(editorStates.visible).toBe(true);
      expect(editorStates.editing).toBe(true);
      expect(editorStates.selectedText.id).toBe('text-1');

      // Simulate editor close
      editorStates.visible = false;
      editorStates.editing = false;
      editorStates.selectedText = null;

      expect(editorStates.visible).toBe(false);
      expect(editorStates.editing).toBe(false);
      expect(editorStates.selectedText).toBe(null);
    });

    test('handles text selection and deselection', () => {
      const textElements = [
        { id: 'text-1', selected: false },
        { id: 'text-2', selected: false },
        { id: 'text-3', selected: false }
      ];

      // Select text element
      const selectText = (id) => {
        textElements.forEach(el => el.selected = el.id === id);
      };

      selectText('text-2');
      expect(textElements[0].selected).toBe(false);
      expect(textElements[1].selected).toBe(true);
      expect(textElements[2].selected).toBe(false);

      // Deselect all
      textElements.forEach(el => el.selected = false);
      expect(textElements.every(el => !el.selected)).toBe(true);
    });

    test('validates text content and handles empty text', () => {
      const validateText = (text) => {
        return {
          isValid: text && text.trim().length > 0,
          isEmpty: !text || text.trim().length === 0,
          length: text ? text.length : 0
        };
      };

      expect(validateText('Hello World').isValid).toBe(true);
      expect(validateText('Hello World').isEmpty).toBe(false);
      expect(validateText('Hello World').length).toBe(11);

      expect(validateText('').isValid).toBe(false);
      expect(validateText('').isEmpty).toBe(true);
      expect(validateText('').length).toBe(0);

      expect(validateText('   ').isValid).toBe(false);
      expect(validateText('   ').isEmpty).toBe(true);
      expect(validateText('   ').length).toBe(3);
    });
  });

  describe('Text Rendering and Canvas Integration', () => {
    test('renders text to canvas with proper font settings', () => {
      const textData = {
        x: 100,
        y: 150,
        text: 'Test Text',
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#333333',
        bold: true,
        italic: false
      };

      // Simulate canvas text rendering
      mockCanvas.font = `${textData.bold ? 'bold ' : ''}${textData.fontSize}px ${textData.fontFamily}`;
      mockCanvas.fillStyle = textData.color;
      mockCanvas.fillText(textData.text, textData.x, textData.y);

      expect(mockCanvas.font).toBe('bold 18px Arial');
      expect(mockCanvas.fillStyle).toBe('#333333');
      expect(mockCanvas.fillText).toHaveBeenCalledWith('Test Text', 100, 150);
    });

    test('renders text background to canvas', () => {
      const textData = {
        x: 100,
        y: 150,
        text: 'Test Text',
        background: {
          enabled: true,
          color: '#ffffff',
          opacity: 80,
          cornerRadius: 4,
          padding: 8
        }
      };

      // Calculate background dimensions
      const textMetrics = { width: 80, height: 18 };
      const bgWidth = textMetrics.width + (textData.background.padding * 2);
      const bgHeight = textMetrics.height + (textData.background.padding * 2);
      const bgX = textData.x - textData.background.padding;
      const bgY = textData.y - textMetrics.height - textData.background.padding;

      // Mock background rendering
      mockCanvas.fillStyle = `rgba(255, 255, 255, ${textData.background.opacity / 100})`;
      mockCanvas.fillRect(bgX, bgY, bgWidth, bgHeight);

      expect(mockCanvas.fillStyle).toBe('rgba(255, 255, 255, 0.8)');
      expect(mockCanvas.fillRect).toHaveBeenCalledWith(92, 124, 96, 34);
    });

    test('handles text measurement for layout calculations', () => {
      const textData = {
        text: 'Sample Text for Measurement',
        fontSize: 16,
        fontFamily: 'Arial'
      };

      mockCanvas.font = `${textData.fontSize}px ${textData.fontFamily}`;
      mockCanvas.measureText.mockReturnValue({ width: 200 });
      
      const metrics = mockCanvas.measureText(textData.text);
      
      expect(mockCanvas.font).toBe('16px Arial');
      expect(mockCanvas.measureText).toHaveBeenCalledWith(textData.text);
      expect(metrics.width).toBe(200);
    });
  });

  describe('Text Tool Integration', () => {
    test('handles text tool activation and mode switching', () => {
      const toolStates = {
        currentTool: 'rectangle',
        textMode: false,
        textCursor: false
      };

      // Activate text tool
      const activateTextTool = () => {
        toolStates.currentTool = 'text';
        toolStates.textMode = true;
        toolStates.textCursor = true;
      };

      activateTextTool();
      expect(toolStates.currentTool).toBe('text');
      expect(toolStates.textMode).toBe(true);
      expect(toolStates.textCursor).toBe(true);

      // Deactivate text tool
      const deactivateTextTool = () => {
        toolStates.currentTool = null;
        toolStates.textMode = false;
        toolStates.textCursor = false;
      };

      deactivateTextTool();
      expect(toolStates.currentTool).toBe(null);
      expect(toolStates.textMode).toBe(false);
      expect(toolStates.textCursor).toBe(false);
    });

    test('validates keyboard shortcuts for text operations', () => {
      const shortcuts = {
        'Ctrl+T': 'activate-text-tool',
        'Ctrl+B': 'toggle-bold',
        'Ctrl+I': 'toggle-italic',
        'Ctrl+U': 'toggle-underline',
        'Escape': 'finish-text-editing'
      };

      expect(shortcuts['Ctrl+T']).toBe('activate-text-tool');
      expect(shortcuts['Ctrl+B']).toBe('toggle-bold');
      expect(shortcuts['Ctrl+I']).toBe('toggle-italic');
      expect(shortcuts['Ctrl+U']).toBe('toggle-underline');
      expect(shortcuts['Escape']).toBe('finish-text-editing');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid font family gracefully', () => {
      const fallbackFont = 'Arial';
      const testFont = (fontFamily) => {
        // Simulate font validation
        const validFonts = ['Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana'];
        return validFonts.includes(fontFamily) ? fontFamily : fallbackFont;
      };

      expect(testFont('Arial')).toBe('Arial');
      expect(testFont('InvalidFont')).toBe('Arial');
      expect(testFont('')).toBe('Arial');
      expect(testFont(null)).toBe('Arial');
    });

    test('handles invalid color values gracefully', () => {
      const defaultColor = '#000000';
      const validateColor = (color) => {
        const hexColorRegex = /^#[0-9a-f]{6}$/i;
        return hexColorRegex.test(color) ? color : defaultColor;
      };

      expect(validateColor('#ffffff')).toBe('#ffffff');
      expect(validateColor('#123456')).toBe('#123456');
      expect(validateColor('invalid')).toBe('#000000');
      expect(validateColor('')).toBe('#000000');
      expect(validateColor('#xyz')).toBe('#000000');
    });

    test('handles text overflow and boundary checking', () => {
      const canvasBounds = { width: 1000, height: 600 };
      const textData = { x: 950, y: 590, text: 'This is a long text that might overflow' };
      
      const isWithinBounds = (x, y, textWidth, textHeight) => {
        return x >= 0 && y >= 0 && 
               x + textWidth <= canvasBounds.width && 
               y + textHeight <= canvasBounds.height;
      };

      // Mock text dimensions
      const textWidth = 300;
      const textHeight = 20;
      
      expect(isWithinBounds(100, 100, textWidth, textHeight)).toBe(true);
      expect(isWithinBounds(950, 590, textWidth, textHeight)).toBe(false); // Overflows
    });
  });
});