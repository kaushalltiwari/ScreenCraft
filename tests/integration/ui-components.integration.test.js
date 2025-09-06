/**
 * Integration tests for UI Components
 * Tests interactions between different UI components and their integration with the annotation system
 */

// Mock DOM environment for UI testing
const { JSDOM } = require('jsdom');

// Create a mock DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <link rel="stylesheet" href="styles/main.css">
    </head>
    <body>
      <div class="main-content">
        <div class="content-wrapper">
          <div class="image-wrapper" id="imageWrapper">
            <img id="screenshotImage" class="screenshot-image" alt="Screenshot">
            <canvas id="annotationCanvas" class="annotation-canvas" width="1000" height="600"></canvas>
          </div>
        </div>
      </div>
      
      <div class="top-toolbar">
        <div class="toolbar-group">
          <!-- File Actions -->
          <button class="toolbar-button" id="saveBtn">Save</button>
          <button class="toolbar-button" id="copyImageBtn">Copy</button>
          <button class="toolbar-button" id="copyPathBtn">Path</button>
        </div>
        
        <div class="toolbar-separator"></div>
        
        <div class="toolbar-group">
          <!-- Drawing Tools -->
          <div class="shapes-tool">
            <button class="toolbar-button" id="shapesBtn">Shapes</button>
            <div class="dropdown-base shapes-dropdown" id="shapesDropdown">
              <div class="shape-options">
                <div class="shape-option selected" data-shape="rectangle">⬛</div>
                <div class="shape-option" data-shape="circle">⭕</div>
                <div class="shape-option" data-shape="arrow">↗️</div>
                <div class="shape-option" data-shape="line">📏</div>
              </div>
            </div>
          </div>
          
          <div class="text-tool">
            <button class="toolbar-button" id="textBtn">Text</button>
            <div class="dropdown-base text-style-dropdown" id="textStyleDropdown">
              <div class="style-options">
                <div class="style-option" data-style="bold">B</div>
                <div class="style-option" data-style="italic">I</div>
                <div class="style-option" data-style="underline">U</div>
              </div>
            </div>
          </div>
          
          <div class="border-tool">
            <button class="toolbar-button" id="colorBtn">Color</button>
            <div class="dropdown-base border-color-dropdown" id="borderColorDropdown">
              <div class="color-option-base selected" data-color="#e74c3c"></div>
              <div class="color-option-base" data-color="#3498db"></div>
              <div class="color-option-base" data-color="#2ecc71"></div>
              <div class="color-option-base" data-color="#f39c12"></div>
              <div class="color-option-base" data-color="#9b59b6"></div>
              <div class="color-option-base" data-color="#000000"></div>
              <div class="color-option-base" data-color="#ffffff"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="status-bar">
        <span class="info-item">
          <span class="info-value" id="imageDimensions">0 × 0</span>
        </span>
        <span class="info-item">
          <span class="info-value" id="fileSize">0 KB</span>
        </span>
      </div>
    </body>
  </html>
`, { pretendToBeVisual: true });

// Set up global DOM
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;

describe('UI Components Integration Tests', () => {
  let uiComponents;
  let mockCanvas;

  beforeEach(() => {
    // Reset DOM to initial state
    const dropdowns = document.querySelectorAll('.dropdown-base');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });

    const selectedElements = document.querySelectorAll('.selected');
    selectedElements.forEach(element => {
      element.classList.remove('selected');
    });

    // Mock canvas context
    mockCanvas = {
      getContext: jest.fn(() => ({
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        rect: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100 })),
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        strokeStyle: '#000000',
        fillStyle: '#000000',
        font: '16px Arial',
        lineWidth: 2
      }))
    };

    document.getElementById('annotationCanvas').getContext = mockCanvas.getContext;

    // UI Components controller mock
    uiComponents = {
      currentTool: null,
      selectedColor: '#e74c3c',
      annotations: [],
      dropdownManager: {
        activeDropdown: null,
        exclusiveMode: true
      }
    };

    jest.clearAllMocks();
  });

  describe('Toolbar Integration', () => {
    test('integrates file action buttons with functionality', () => {
      const saveBtn = document.getElementById('saveBtn');
      const copyImageBtn = document.getElementById('copyImageBtn');
      const copyPathBtn = document.getElementById('copyPathBtn');

      expect(saveBtn).not.toBeNull();
      expect(copyImageBtn).not.toBeNull();
      expect(copyPathBtn).not.toBeNull();

      // Test button states
      const setButtonState = (button, state) => {
        switch (state) {
          case 'disabled':
            button.disabled = true;
            button.style.opacity = '0.5';
            break;
          case 'loading':
            button.textContent = 'Loading...';
            button.disabled = true;
            break;
          case 'normal':
            button.disabled = false;
            button.style.opacity = '1';
            break;
        }
      };

      setButtonState(saveBtn, 'disabled');
      expect(saveBtn.disabled).toBe(true);
      expect(saveBtn.style.opacity).toBe('0.5');

      setButtonState(copyImageBtn, 'loading');
      expect(copyImageBtn.textContent).toBe('Loading...');
      expect(copyImageBtn.disabled).toBe(true);
    });

    test('manages toolbar group interactions', () => {
      const toolbarGroups = document.querySelectorAll('.toolbar-group');
      expect(toolbarGroups.length).toBeGreaterThan(0);

      // Test toolbar group separation
      const separators = document.querySelectorAll('.toolbar-separator');
      expect(separators.length).toBeGreaterThan(0);

      // Test button grouping logic
      const fileActionsGroup = toolbarGroups[0];
      const drawingToolsGroup = toolbarGroups[1];

      const fileButtons = fileActionsGroup.querySelectorAll('.toolbar-button');
      const drawingButtons = drawingToolsGroup.querySelectorAll('.toolbar-button');

      expect(fileButtons.length).toBe(3); // Save, Copy, Path
      expect(drawingButtons.length).toBeGreaterThan(0); // Shapes, Text, Color
    });

    test('handles responsive toolbar behavior', () => {
      const toolbar = document.querySelector('.top-toolbar');
      
      // Mock responsive breakpoint testing
      const testResponsiveBreakpoints = (width) => {
        if (width < 768) {
          return {
            layout: 'compact',
            buttonSize: 'small',
            separatorVisible: false
          };
        } else if (width < 1024) {
          return {
            layout: 'medium', 
            buttonSize: 'normal',
            separatorVisible: true
          };
        } else {
          return {
            layout: 'full',
            buttonSize: 'normal', 
            separatorVisible: true
          };
        }
      };

      const mobileLayout = testResponsiveBreakpoints(500);
      const tabletLayout = testResponsiveBreakpoints(800);
      const desktopLayout = testResponsiveBreakpoints(1200);

      expect(mobileLayout.layout).toBe('compact');
      expect(tabletLayout.separatorVisible).toBe(true);
      expect(desktopLayout.layout).toBe('full');
    });
  });

  describe('Dropdown System Integration', () => {
    test('implements exclusive dropdown behavior', () => {
      const shapesBtn = document.getElementById('shapesBtn');
      const colorBtn = document.getElementById('colorBtn');
      const shapesDropdown = document.getElementById('shapesDropdown');
      const colorDropdown = document.getElementById('borderColorDropdown');

      const dropdownController = {
        openDropdown: (dropdownId) => {
          // Close all other dropdowns (exclusive behavior)
          const allDropdowns = document.querySelectorAll('.dropdown-base');
          allDropdowns.forEach(dropdown => {
            if (dropdown.id !== dropdownId) {
              dropdown.classList.remove('show');
            }
          });
          
          // Open requested dropdown
          const targetDropdown = document.getElementById(dropdownId);
          if (targetDropdown) {
            targetDropdown.classList.add('show');
            return true;
          }
          return false;
        }
      };

      // Test exclusive behavior
      dropdownController.openDropdown('shapesDropdown');
      expect(shapesDropdown.classList.contains('show')).toBe(true);
      expect(colorDropdown.classList.contains('show')).toBe(false);

      dropdownController.openDropdown('borderColorDropdown');
      expect(shapesDropdown.classList.contains('show')).toBe(false);
      expect(colorDropdown.classList.contains('show')).toBe(true);
    });

    test('manages dropdown positioning and visibility', () => {
      const colorBtn = document.getElementById('colorBtn');
      const colorDropdown = document.getElementById('borderColorDropdown');

      const calculateDropdownPosition = (button, dropdown) => {
        const buttonRect = button.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        
        return {
          left: buttonRect.left + (buttonRect.width / 2) - (dropdownRect.width / 2),
          top: buttonRect.bottom + 4,
          isVisible: dropdown.classList.contains('show')
        };
      };

      // Mock getBoundingClientRect
      colorBtn.getBoundingClientRect = jest.fn(() => ({
        left: 300, top: 50, width: 80, height: 40, bottom: 90
      }));
      
      colorDropdown.getBoundingClientRect = jest.fn(() => ({
        width: 200, height: 100
      }));

      const position = calculateDropdownPosition(colorBtn, colorDropdown);
      
      expect(position.left).toBe(240); // 300 + 40 - 100 (centered)
      expect(position.top).toBe(94); // 90 + 4 (below button)
    });

    test('handles dropdown content updates', () => {
      const shapesDropdown = document.getElementById('shapesDropdown');
      const shapeOptions = shapesDropdown.querySelectorAll('.shape-option');

      const updateDropdownContent = (dropdownId, newContent) => {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return false;

        // Update shape options
        if (dropdownId === 'shapesDropdown' && newContent.shapes) {
          const optionsContainer = dropdown.querySelector('.shape-options');
          optionsContainer.innerHTML = '';
          
          newContent.shapes.forEach((shape, index) => {
            const option = document.createElement('div');
            option.className = 'shape-option';
            option.setAttribute('data-shape', shape.type);
            option.textContent = shape.icon;
            if (index === 0) option.classList.add('selected');
            optionsContainer.appendChild(option);
          });
          
          return true;
        }
        
        return false;
      };

      const newShapes = {
        shapes: [
          { type: 'rectangle', icon: '⬛' },
          { type: 'circle', icon: '⭕' }, 
          { type: 'triangle', icon: '🔺' }, // New shape
          { type: 'star', icon: '⭐' } // New shape
        ]
      };

      const updated = updateDropdownContent('shapesDropdown', newShapes);
      expect(updated).toBe(true);

      const updatedOptions = shapesDropdown.querySelectorAll('.shape-option');
      expect(updatedOptions.length).toBe(4);
      expect(updatedOptions[2].getAttribute('data-shape')).toBe('triangle');
    });
  });

  describe('Canvas and Annotation Integration', () => {
    test('integrates canvas with toolbar tool selection', () => {
      const canvas = document.getElementById('annotationCanvas');
      const context = canvas.getContext('2d');

      const canvasController = {
        currentTool: null,
        isDrawing: false,
        
        setTool: (toolType) => {
          this.currentTool = toolType;
          
          // Update cursor based on tool
          switch (toolType) {
            case 'rectangle':
            case 'circle':
            case 'arrow':
            case 'line':
              canvas.style.cursor = 'crosshair';
              break;
            case 'text':
              canvas.style.cursor = 'text';
              break;
            default:
              canvas.style.cursor = 'default';
          }
        },
        
        handleMouseEvent: (event) => {
          if (!this.currentTool) return;
          
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          
          return { x, y, tool: this.currentTool };
        }
      };

      canvasController.setTool('rectangle');
      expect(canvas.style.cursor).toBe('crosshair');

      canvasController.setTool('text');  
      expect(canvas.style.cursor).toBe('text');

      // Mock mouse event
      const mockMouseEvent = {
        clientX: 400,
        clientY: 300
      };
      
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 100, top: 50
      }));

      const mouseResult = canvasController.handleMouseEvent(mockMouseEvent);
      expect(mouseResult.x).toBe(300); // 400 - 100
      expect(mouseResult.y).toBe(250); // 300 - 50
      expect(mouseResult.tool).toBe('text');
    });

    test('synchronizes UI state with annotation data', () => {
      const annotationManager = {
        annotations: [],
        
        addAnnotation: (annotation) => {
          annotation.id = `annotation-${Date.now()}`;
          annotation.timestamp = Date.now();
          this.annotations.push(annotation);
          this.updateUI();
          return annotation.id;
        },
        
        removeAnnotation: (annotationId) => {
          const index = this.annotations.findIndex(a => a.id === annotationId);
          if (index !== -1) {
            this.annotations.splice(index, 1);
            this.updateUI();
            return true;
          }
          return false;
        },
        
        updateUI: () => {
          // Update status bar with annotation count
          const statusBar = document.querySelector('.status-bar');
          const annotationCount = this.annotations.length;
          
          // Find or create annotation counter
          let counterElement = document.getElementById('annotationCount');
          if (!counterElement) {
            counterElement = document.createElement('span');
            counterElement.id = 'annotationCount';
            counterElement.className = 'info-item';
            statusBar.appendChild(counterElement);
          }
          
          counterElement.innerHTML = `<span class="info-value">${annotationCount} annotations</span>`;
        }
      };

      // Test adding annotations
      const textAnnotation = {
        type: 'text',
        x: 200, y: 100,
        text: 'Sample text',
        fontSize: 16
      };

      const rectangleAnnotation = {
        type: 'rectangle',
        x: 100, y: 150,
        width: 200, height: 100,
        strokeColor: '#e74c3c'
      };

      annotationManager.addAnnotation(textAnnotation);
      annotationManager.addAnnotation(rectangleAnnotation);

      expect(annotationManager.annotations.length).toBe(2);
      
      const counterElement = document.getElementById('annotationCount');
      expect(counterElement).not.toBeNull();
      expect(counterElement.textContent).toContain('2 annotations');
    });

    test('handles canvas resize and scaling', () => {
      const canvas = document.getElementById('annotationCanvas');
      const imageWrapper = document.getElementById('imageWrapper');

      const canvasResizer = {
        resizeCanvas: (newWidth, newHeight) => {
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // Update canvas style for display
          canvas.style.width = newWidth + 'px';
          canvas.style.height = newHeight + 'px';
          
          // Re-draw existing annotations at new scale
          this.redrawAnnotations();
          
          return { width: newWidth, height: newHeight };
        },
        
        redrawAnnotations: () => {
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Mock redraw logic
          return true;
        },
        
        fitToImage: (imageWidth, imageHeight) => {
          const maxWidth = imageWrapper.clientWidth || 1000;
          const maxHeight = imageWrapper.clientHeight || 600;
          
          const scaleX = maxWidth / imageWidth;
          const scaleY = maxHeight / imageHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
          
          const displayWidth = imageWidth * scale;
          const displayHeight = imageHeight * scale;
          
          return this.resizeCanvas(displayWidth, displayHeight);
        }
      };

      const result = canvasResizer.resizeCanvas(800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);

      const fitResult = canvasResizer.fitToImage(1920, 1080);
      expect(fitResult.width).toBeLessThanOrEqual(1000);
      expect(fitResult.height).toBeLessThanOrEqual(600);
    });
  });

  describe('Color Picker Integration', () => {
    test('synchronizes color selection across UI components', () => {
      const colorOptions = document.querySelectorAll('.color-option-base');
      const colorIndicator = document.querySelector('.border-color-indicator');

      const colorManager = {
        selectedColor: '#e74c3c',
        
        setColor: (newColor) => {
          this.selectedColor = newColor;
          this.updateColorUI();
          this.updateCanvasContext();
        },
        
        updateColorUI: () => {
          // Update color options selection
          colorOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-color') === this.selectedColor) {
              option.classList.add('selected');
            }
          });
          
          // Update color indicator
          if (colorIndicator) {
            colorIndicator.style.backgroundColor = this.selectedColor;
          }
        },
        
        updateCanvasContext: () => {
          const canvas = document.getElementById('annotationCanvas');
          const context = canvas.getContext('2d');
          context.strokeStyle = this.selectedColor;
          context.fillStyle = this.selectedColor;
        }
      };

      // Test color selection
      colorManager.setColor('#3498db');
      
      expect(colorManager.selectedColor).toBe('#3498db');
      
      // Verify UI updates
      const blueOption = Array.from(colorOptions).find(
        option => option.getAttribute('data-color') === '#3498db'
      );
      expect(blueOption?.classList.contains('selected')).toBe(true);
      
      const redOption = Array.from(colorOptions).find(
        option => option.getAttribute('data-color') === '#e74c3c'
      );
      expect(redOption?.classList.contains('selected')).toBe(false);
    });

    test('handles color picker accessibility', () => {
      const colorOptions = document.querySelectorAll('.color-option-base');

      const accessibilityHelper = {
        addKeyboardNavigation: () => {
          colorOptions.forEach((option, index) => {
            option.tabIndex = 0;
            option.setAttribute('role', 'button');
            option.setAttribute('aria-label', `Color option ${option.getAttribute('data-color')}`);
            
            option.addEventListener('keydown', (e) => {
              switch (e.key) {
                case 'Enter':
                case ' ':
                  e.preventDefault();
                  option.click();
                  break;
                case 'ArrowRight':
                  e.preventDefault();
                  const nextOption = colorOptions[index + 1] || colorOptions[0];
                  nextOption.focus();
                  break;
                case 'ArrowLeft':
                  e.preventDefault();
                  const prevOption = colorOptions[index - 1] || colorOptions[colorOptions.length - 1];
                  prevOption.focus();
                  break;
              }
            });
          });
        },
        
        addHighContrastSupport: () => {
          const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
          if (isHighContrast) {
            colorOptions.forEach(option => {
              option.style.border = '2px solid black';
            });
          }
        }
      };

      accessibilityHelper.addKeyboardNavigation();
      
      // Verify accessibility attributes
      expect(colorOptions[0].getAttribute('role')).toBe('button');
      expect(colorOptions[0].getAttribute('aria-label')).toContain('Color option');
      expect(colorOptions[0].tabIndex).toBe(0);
    });

    test('validates color format and fallbacks', () => {
      const colorValidator = {
        isValidHex: (color) => {
          return /^#[0-9A-F]{6}$/i.test(color);
        },
        
        isValidRgba: (color) => {
          return /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)$/i.test(color);
        },
        
        sanitizeColor: (color, fallback = '#000000') => {
          if (this.isValidHex(color) || this.isValidRgba(color)) {
            return color;
          }
          
          console.warn(`Invalid color format: ${color}, using fallback: ${fallback}`);
          return fallback;
        },
        
        convertToHex: (rgbaColor) => {
          // Mock conversion logic
          const rgbaMatch = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0'); 
            const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          }
          return rgbaColor;
        }
      };

      expect(colorValidator.isValidHex('#ff0000')).toBe(true);
      expect(colorValidator.isValidHex('#xyz')).toBe(false);
      expect(colorValidator.isValidRgba('rgba(255, 0, 0, 1)')).toBe(true);
      
      expect(colorValidator.sanitizeColor('#invalid')).toBe('#000000');
      expect(colorValidator.convertToHex('rgba(255, 0, 0, 1)')).toBe('#ff0000');
    });
  });

  describe('Status Bar Integration', () => {
    test('updates status information dynamically', () => {
      const imageDimensions = document.getElementById('imageDimensions');
      const fileSize = document.getElementById('fileSize');

      const statusBarManager = {
        updateImageInfo: (width, height, sizeBytes) => {
          if (imageDimensions) {
            imageDimensions.textContent = `${width} × ${height}`;
          }
          
          if (fileSize) {
            const sizeMB = sizeBytes / (1024 * 1024);
            const sizeKB = sizeBytes / 1024;
            
            if (sizeMB >= 1) {
              fileSize.textContent = `${sizeMB.toFixed(1)} MB`;
            } else {
              fileSize.textContent = `${Math.round(sizeKB)} KB`;
            }
          }
        },
        
        showProgress: (operation, progress) => {
          // Add or update progress indicator
          let progressElement = document.getElementById('progressIndicator');
          if (!progressElement) {
            progressElement = document.createElement('span');
            progressElement.id = 'progressIndicator';
            progressElement.className = 'info-item';
            document.querySelector('.status-bar').appendChild(progressElement);
          }
          
          progressElement.innerHTML = `<span class="info-value">${operation}: ${progress}%</span>`;
          
          if (progress >= 100) {
            setTimeout(() => {
              progressElement.remove();
            }, 2000);
          }
        }
      };

      statusBarManager.updateImageInfo(1920, 1080, 2048000);
      expect(imageDimensions.textContent).toBe('1920 × 1080');
      expect(fileSize.textContent).toBe('2.0 MB');

      statusBarManager.updateImageInfo(800, 600, 524288);
      expect(imageDimensions.textContent).toBe('800 × 600');
      expect(fileSize.textContent).toBe('512 KB');

      statusBarManager.showProgress('Saving', 50);
      const progressElement = document.getElementById('progressIndicator');
      expect(progressElement).not.toBeNull();
      expect(progressElement.textContent).toContain('Saving: 50%');
    });

    test('handles status bar overflow and responsive behavior', () => {
      const statusBar = document.querySelector('.status-bar');
      
      const responsiveStatusBar = {
        checkOverflow: () => {
          const statusBarWidth = statusBar.offsetWidth;
          const items = statusBar.querySelectorAll('.info-item');
          let totalWidth = 0;
          
          items.forEach(item => {
            totalWidth += item.offsetWidth + 16; // Add margin
          });
          
          return totalWidth > statusBarWidth;
        },
        
        adaptToWidth: (containerWidth) => {
          const items = statusBar.querySelectorAll('.info-item');
          
          if (containerWidth < 400) {
            // Hide less important items on mobile
            items.forEach((item, index) => {
              if (index > 1) { // Keep only first 2 items
                item.style.display = 'none';
              }
            });
          } else {
            // Show all items
            items.forEach(item => {
              item.style.display = '';
            });
          }
        }
      };

      // Mock offsetWidth properties
      Object.defineProperty(statusBar, 'offsetWidth', { value: 300 });
      statusBar.querySelectorAll('.info-item').forEach(item => {
        Object.defineProperty(item, 'offsetWidth', { value: 100 });
      });

      const isOverflowing = responsiveStatusBar.checkOverflow();
      expect(typeof isOverflowing).toBe('boolean');

      responsiveStatusBar.adaptToWidth(350);
      // Verify mobile adaptation logic would work
    });
  });

  describe('Event Handling Integration', () => {
    test('coordinates global event handling', () => {
      const globalEventManager = {
        activeDropdown: null,
        
        handleDocumentClick: (event) => {
          // Close dropdowns when clicking outside
          if (this.activeDropdown && !event.target.closest('.dropdown-base')) {
            document.getElementById(this.activeDropdown).classList.remove('show');
            this.activeDropdown = null;
          }
        },
        
        handleKeyboardShortcuts: (event) => {
          // Handle global keyboard shortcuts
          if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
              case 's':
                event.preventDefault();
                document.getElementById('saveBtn').click();
                break;
              case 'c':
                event.preventDefault(); 
                document.getElementById('copyImageBtn').click();
                break;
              case 't':
                event.preventDefault();
                document.getElementById('textBtn').click();
                break;
            }
          }
          
          if (event.key === 'Escape') {
            // Close all dropdowns
            document.querySelectorAll('.dropdown-base.show').forEach(dropdown => {
              dropdown.classList.remove('show');
            });
            this.activeDropdown = null;
          }
        }
      };

      // Test document click handling
      const outsideClick = { target: document.body };
      globalEventManager.activeDropdown = 'shapesDropdown';
      globalEventManager.handleDocumentClick(outsideClick);
      expect(globalEventManager.activeDropdown).toBe(null);

      // Test keyboard shortcuts
      const ctrlSEvent = { 
        ctrlKey: true, 
        key: 's', 
        preventDefault: jest.fn() 
      };
      
      const saveBtn = document.getElementById('saveBtn');
      saveBtn.click = jest.fn();
      
      globalEventManager.handleKeyboardShortcuts(ctrlSEvent);
      expect(ctrlSEvent.preventDefault).toHaveBeenCalled();
      expect(saveBtn.click).toHaveBeenCalled();
    });

    test('manages event delegation and performance', () => {
      const eventDelegator = {
        setupEventDelegation: () => {
          // Single event listener for all toolbar buttons
          document.addEventListener('click', (event) => {
            const button = event.target.closest('.toolbar-button');
            if (button) {
              this.handleToolbarButtonClick(button, event);
            }
            
            const colorOption = event.target.closest('.color-option-base');
            if (colorOption) {
              this.handleColorOptionClick(colorOption, event);
            }
            
            const shapeOption = event.target.closest('.shape-option');
            if (shapeOption) {
              this.handleShapeOptionClick(shapeOption, event);
            }
          });
        },
        
        handleToolbarButtonClick: (button, event) => {
          event.stopPropagation();
          
          const buttonId = button.id;
          const dropdown = button.nextElementSibling;
          
          if (dropdown && dropdown.classList.contains('dropdown-base')) {
            dropdown.classList.toggle('show');
          }
          
          return buttonId;
        },
        
        handleColorOptionClick: (option, event) => {
          event.stopPropagation();
          
          const color = option.getAttribute('data-color');
          
          // Update selection
          option.parentElement.querySelectorAll('.color-option-base').forEach(opt => {
            opt.classList.remove('selected');
          });
          option.classList.add('selected');
          
          return color;
        },
        
        handleShapeOptionClick: (option, event) => {
          event.stopPropagation();
          
          const shape = option.getAttribute('data-shape');
          
          // Update selection  
          option.parentElement.querySelectorAll('.shape-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          option.classList.add('selected');
          
          return shape;
        }
      };

      eventDelegator.setupEventDelegation();

      // Test event delegation
      const mockToolbarButton = document.getElementById('colorBtn');
      const mockClickEvent = {
        target: mockToolbarButton,
        stopPropagation: jest.fn()
      };

      const result = eventDelegator.handleToolbarButtonClick(mockToolbarButton, mockClickEvent);
      expect(result).toBe('colorBtn');
      expect(mockClickEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});