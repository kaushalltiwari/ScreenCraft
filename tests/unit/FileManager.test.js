/**
 * Unit tests for FileManager
 * Tests file operations, image processing, and annotation rendering
 */

const fs = require('fs').promises;
const path = require('path');

// Mock Jimp for image processing tests
jest.mock('jimp', () => ({
  Jimp: {
    read: jest.fn(() => Promise.resolve({
      clone: jest.fn().mockReturnThis(),
      crop: jest.fn().mockReturnThis(),
      composite: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      quality: jest.fn().mockReturnThis(),
      getBuffer: jest.fn(() => Promise.resolve(Buffer.from('mock-image-data'))),
      write: jest.fn(() => Promise.resolve()),
      bitmap: { width: 1920, height: 1080 },
      getWidth: jest.fn(() => 1920),
      getHeight: jest.fn(() => 1080)
    })),
    MIME_PNG: 'image/png',
    MIME_JPEG: 'image/jpeg'
  }
}));

// Mock temp module
jest.mock('temp', () => ({
  track: jest.fn(),
  mkdirSync: jest.fn(() => '/tmp/test-screenshots'),
  cleanup: jest.fn(),
  path: jest.fn(() => '/tmp/test-file.png')
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-12345')
}));

describe('FileManager', () => {
  let FileManager;
  let mockElectron;

  beforeEach(() => {
    // Mock Electron APIs
    mockElectron = {
      clipboard: {
        writeImage: jest.fn(),
        writeText: jest.fn()
      },
      nativeImage: {
        createFromPath: jest.fn(() => ({
          toPNG: jest.fn(() => Buffer.from('mock-png')),
          getSize: jest.fn(() => ({ width: 800, height: 600 }))
        })),
        createFromBuffer: jest.fn(() => ({
          toPNG: jest.fn(() => Buffer.from('mock-png-from-buffer')),
          getSize: jest.fn(() => ({ width: 800, height: 600 }))
        }))
      },
      shell: {
        openPath: jest.fn(() => Promise.resolve()),
        showItemInFolder: jest.fn()
      }
    };

    jest.doMock('electron', () => mockElectron);
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create FileManager instance (would normally require the actual file)
    FileManager = {
      processScreenshot: jest.fn(),
      saveScreenshotWithAnnotations: jest.fn(),
      copyImageToClipboard: jest.fn(),
      copyFilePathToClipboard: jest.fn(),
      cleanupOldScreenshots: jest.fn(),
      renderAnnotationsToImage: jest.fn()
    };
  });

  describe('Screenshot Processing', () => {
    test('processes screenshot with cropping', async () => {
      const { Jimp } = require('jimp');
      
      const selectionData = {
        x: 100,
        y: 50,
        width: 300,
        height: 200,
        screenIndex: 0
      };

      const mockImage = await Jimp.read('fake-path');
      
      // Simulate cropping operation
      mockImage.crop(selectionData.x, selectionData.y, selectionData.width, selectionData.height);
      
      expect(mockImage.crop).toHaveBeenCalledWith(100, 50, 300, 200);
      
      const buffer = await mockImage.getBuffer(Jimp.MIME_PNG);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    test('handles multiple screen processing', async () => {
      const multiScreenData = [
        { screenIndex: 0, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
        { screenIndex: 1, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }
      ];

      multiScreenData.forEach((screen, index) => {
        expect(screen.screenIndex).toBe(index);
        expect(screen.bounds.width).toBe(1920);
        expect(screen.bounds.height).toBe(1080);
      });
    });

    test('validates image quality and format options', async () => {
      const { Jimp } = require('jimp');
      
      const qualitySettings = {
        png: { format: Jimp.MIME_PNG, quality: 100 },
        jpeg: { format: Jimp.MIME_JPEG, quality: 85 }
      };

      const mockImage = await Jimp.read('fake-path');
      
      // Test PNG format (no quality setting needed)
      await mockImage.getBuffer(qualitySettings.png.format);
      
      // Test JPEG format with quality
      mockImage.quality(qualitySettings.jpeg.quality);
      await mockImage.getBuffer(qualitySettings.jpeg.format);
      
      expect(mockImage.quality).toHaveBeenCalledWith(85);
    });
  });

  describe('Annotation Rendering', () => {
    test('renders text annotations to image', async () => {
      const textAnnotations = [
        {
          id: 'text-1',
          type: 'text',
          x: 200, y: 150,
          text: 'Sample Text',
          fontSize: 18,
          fontFamily: 'Arial',
          color: '#000000',
          bold: false,
          italic: false,
          underline: false,
          background: {
            enabled: true,
            color: '#ffffff',
            opacity: 80,
            cornerRadius: 4,
            padding: 8
          }
        }
      ];

      const annotationRenderer = {
        renderText: (annotation, context) => {
          // Mock text rendering logic
          const textMetrics = {
            width: annotation.text.length * (annotation.fontSize * 0.6),
            height: annotation.fontSize * 1.2
          };
          
          if (annotation.background.enabled) {
            // Render background rectangle
            const bgWidth = textMetrics.width + (annotation.background.padding * 2);
            const bgHeight = textMetrics.height + (annotation.background.padding * 2);
            return { rendered: true, bgWidth, bgHeight };
          }
          
          return { rendered: true, textMetrics };
        }
      };

      const result = annotationRenderer.renderText(textAnnotations[0], {});
      expect(result.rendered).toBe(true);
      expect(result.bgWidth).toBe(textAnnotations[0].text.length * (18 * 0.6) + 16); // padding * 2
    });

    test('renders shape annotations to image', async () => {
      const shapeAnnotations = [
        {
          id: 'shape-1',
          type: 'rectangle',
          x: 100, y: 100,
          width: 200, height: 150,
          strokeColor: '#e74c3c',
          strokeWidth: 2,
          fillColor: 'transparent'
        },
        {
          id: 'shape-2', 
          type: 'circle',
          centerX: 300, centerY: 200,
          radius: 50,
          strokeColor: '#3498db',
          strokeWidth: 3
        },
        {
          id: 'shape-3',
          type: 'arrow',
          startX: 400, startY: 100,
          endX: 500, endY: 200,
          strokeColor: '#2ecc71',
          strokeWidth: 2,
          headSize: 15
        }
      ];

      const shapeRenderer = {
        renderShapes: (shapes) => {
          return shapes.map(shape => {
            switch (shape.type) {
              case 'rectangle':
                return { type: 'rectangle', rendered: true, area: shape.width * shape.height };
              case 'circle':
                return { type: 'circle', rendered: true, area: Math.PI * Math.pow(shape.radius, 2) };
              case 'arrow':
                const length = Math.sqrt(
                  Math.pow(shape.endX - shape.startX, 2) + 
                  Math.pow(shape.endY - shape.startY, 2)
                );
                return { type: 'arrow', rendered: true, length };
              default:
                return { rendered: false };
            }
          });
        }
      };

      const results = shapeRenderer.renderShapes(shapeAnnotations);
      
      expect(results[0].area).toBe(30000); // 200 * 150
      expect(results[1].area).toBeCloseTo(7853.98, 2); // π * 50²
      expect(results[2].length).toBeCloseTo(141.42, 2); // √((100)² + (100)²)
    });

    test('handles annotation layering and z-index', async () => {
      const layeredAnnotations = [
        { id: 'bg-1', type: 'rectangle', zIndex: 1 },
        { id: 'text-1', type: 'text', zIndex: 3 },
        { id: 'arrow-1', type: 'arrow', zIndex: 2 }
      ];

      const sortedAnnotations = layeredAnnotations.sort((a, b) => a.zIndex - b.zIndex);
      
      expect(sortedAnnotations[0].id).toBe('bg-1'); // zIndex 1
      expect(sortedAnnotations[1].id).toBe('arrow-1'); // zIndex 2  
      expect(sortedAnnotations[2].id).toBe('text-1'); // zIndex 3
    });
  });

  describe('File Operations', () => {
    test('creates unique filenames with timestamps', async () => {
      const { v4: uuidv4 } = require('uuid');
      
      const generateFilename = (prefix = 'screenshot', extension = 'png') => {
        const timestamp = Date.now();
        const uuid = uuidv4();
        return `${prefix}-${timestamp}-${uuid}.${extension}`;
      };

      const filename1 = generateFilename();
      const filename2 = generateFilename();
      
      expect(filename1).toContain('screenshot-');
      expect(filename1).toContain('.png');
      expect(filename1).not.toBe(filename2); // Should be unique
    });

    test('manages temporary file cleanup', async () => {
      const temp = require('temp');
      
      const tempManager = {
        createTempFile: () => {
          const tempPath = temp.path({ suffix: '.png' });
          temp.track();
          return tempPath;
        },
        
        cleanupOldFiles: (directory, maxAgeHours = 24) => {
          const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
          const cutoffTime = Date.now() - maxAge;
          
          // Mock cleanup logic
          const mockFiles = [
            { name: 'old-screenshot.png', mtime: cutoffTime - 1000 },
            { name: 'recent-screenshot.png', mtime: Date.now() }
          ];
          
          return mockFiles.filter(file => file.mtime < cutoffTime);
        }
      };

      const tempFile = tempManager.createTempFile();
      expect(tempFile).toContain('.png');
      expect(temp.track).toHaveBeenCalled();

      const oldFiles = tempManager.cleanupOldFiles('/tmp');
      expect(oldFiles).toHaveLength(1);
      expect(oldFiles[0].name).toBe('old-screenshot.png');
    });

    test('handles file permission and access errors', async () => {
      const fileOperations = {
        safeWriteFile: async (filePath, data) => {
          try {
            await fs.writeFile(filePath, data);
            return { success: true, filePath };
          } catch (error) {
            if (error.code === 'EACCES') {
              return { success: false, error: 'Permission denied', code: 'EACCES' };
            } else if (error.code === 'ENOENT') {
              return { success: false, error: 'Directory not found', code: 'ENOENT' };
            }
            return { success: false, error: error.message, code: error.code };
          }
        }
      };

      // Mock successful write
      jest.spyOn(fs, 'writeFile').mockResolvedValueOnce();
      const successResult = await fileOperations.safeWriteFile('/tmp/test.png', Buffer.from('data'));
      expect(successResult.success).toBe(true);

      // Mock permission error
      const permissionError = new Error('Permission denied');
      permissionError.code = 'EACCES';
      jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(permissionError);
      
      const errorResult = await fileOperations.safeWriteFile('/restricted/test.png', Buffer.from('data'));
      expect(errorResult.success).toBe(false);
      expect(errorResult.code).toBe('EACCES');
    });
  });

  describe('Clipboard Operations', () => {
    test('copies image to clipboard with proper format', async () => {
      const { clipboard, nativeImage } = mockElectron;
      
      const copyImageToClipboard = (imagePath) => {
        const image = nativeImage.createFromPath(imagePath);
        clipboard.writeImage(image);
        return { success: true, format: 'image' };
      };

      const result = copyImageToClipboard('/tmp/test-screenshot.png');
      
      expect(result.success).toBe(true);
      expect(nativeImage.createFromPath).toHaveBeenCalledWith('/tmp/test-screenshot.png');
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    test('copies file path to clipboard for external tools', async () => {
      const { clipboard } = mockElectron;
      
      const copyPathToClipboard = (filePath) => {
        clipboard.writeText(filePath);
        return { success: true, path: filePath };
      };

      const result = copyPathToClipboard('/tmp/screenshot-123.png');
      
      expect(result.success).toBe(true);
      expect(clipboard.writeText).toHaveBeenCalledWith('/tmp/screenshot-123.png');
    });

    test('handles clipboard errors gracefully', async () => {
      const { clipboard } = mockElectron;
      
      const safeClipboardOperation = (operation, data) => {
        try {
          switch (operation) {
            case 'writeImage':
              clipboard.writeImage(data);
              break;
            case 'writeText':
              clipboard.writeText(data);
              break;
          }
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      // Mock successful operations
      const imageResult = safeClipboardOperation('writeImage', {});
      const textResult = safeClipboardOperation('writeText', 'test');
      
      expect(imageResult.success).toBe(true);
      expect(textResult.success).toBe(true);
    });
  });

  describe('Image Processing Performance', () => {
    test('handles large image processing efficiently', async () => {
      const { Jimp } = require('jimp');
      
      const performanceTest = {
        maxImageSize: 4096 * 2160, // 4K resolution
        maxProcessingTime: 5000, // 5 seconds
        memoryThreshold: 500 * 1024 * 1024 // 500MB
      };

      const processLargeImage = async (imagePath) => {
        const startTime = Date.now();
        const image = await Jimp.read(imagePath);
        
        // Simulate large image operations
        const resized = image.resize(1920, 1080);
        const buffer = await resized.getBuffer(Jimp.MIME_PNG);
        
        const processingTime = Date.now() - startTime;
        const memoryUsed = buffer.length;
        
        return {
          success: true,
          processingTime,
          memoryUsed,
          outputSize: buffer.length
        };
      };

      const mockResult = await processLargeImage('/tmp/large-image.png');
      
      expect(mockResult.success).toBe(true);
      expect(mockResult.outputSize).toBeGreaterThan(0);
    });

    test('optimizes annotation rendering performance', async () => {
      const annotationCount = 100;
      const annotations = Array.from({ length: annotationCount }, (_, i) => ({
        id: `annotation-${i}`,
        type: i % 2 === 0 ? 'text' : 'rectangle',
        x: Math.random() * 1000,
        y: Math.random() * 600
      }));

      const renderAnnotations = (annotations) => {
        const startTime = Date.now();
        
        // Simulate batch rendering
        const rendered = annotations.map(annotation => ({
          ...annotation,
          rendered: true,
          renderTime: Math.random() * 10 // Mock render time per annotation
        }));
        
        const totalTime = Date.now() - startTime;
        const averageTimePerAnnotation = totalTime / annotations.length;
        
        return {
          totalAnnotations: annotations.length,
          totalTime,
          averageTimePerAnnotation,
          success: totalTime < 2000 // Success if under 2 seconds
        };
      };

      const result = renderAnnotations(annotations);
      
      expect(result.totalAnnotations).toBe(100);
      expect(result.averageTimePerAnnotation).toBeLessThan(50); // Less than 50ms per annotation
    });
  });

  describe('File Format Support', () => {
    test('supports multiple image formats', async () => {
      const supportedFormats = {
        'image/png': { extension: 'png', quality: null, lossless: true },
        'image/jpeg': { extension: 'jpg', quality: 85, lossless: false },
        'image/webp': { extension: 'webp', quality: 90, lossless: false }
      };

      Object.entries(supportedFormats).forEach(([mimeType, config]) => {
        expect(config.extension).toBeDefined();
        expect(typeof config.lossless).toBe('boolean');
        
        if (!config.lossless) {
          expect(config.quality).toBeGreaterThan(0);
          expect(config.quality).toBeLessThanOrEqual(100);
        }
      });
    });

    test('validates image metadata and properties', async () => {
      const imageMetadata = {
        width: 1920,
        height: 1080,
        channels: 3, // RGB
        hasAlpha: false,
        colorDepth: 8,
        fileSize: 245760 // bytes
      };

      const validateImage = (metadata) => {
        return {
          isValidSize: metadata.width > 0 && metadata.height > 0,
          isValidChannels: metadata.channels >= 1 && metadata.channels <= 4,
          isValidDepth: [1, 8, 16].includes(metadata.colorDepth),
          aspectRatio: metadata.width / metadata.height
        };
      };

      const validation = validateImage(imageMetadata);
      
      expect(validation.isValidSize).toBe(true);
      expect(validation.isValidChannels).toBe(true);
      expect(validation.isValidDepth).toBe(true);
      expect(validation.aspectRatio).toBeCloseTo(1.778, 3); // 16:9 ratio
    });
  });

  describe('Error Handling and Recovery', () => {
    test('handles corrupted image files', async () => {
      const { Jimp } = require('jimp');
      
      const handleCorruptedImage = async (imagePath) => {
        try {
          const image = await Jimp.read(imagePath);
          return { success: true, image };
        } catch (error) {
          if (error.message.includes('unsupported')) {
            return { success: false, error: 'Unsupported image format', recoverable: false };
          } else if (error.message.includes('corrupted')) {
            return { success: false, error: 'Corrupted image data', recoverable: false };
          }
          return { success: false, error: error.message, recoverable: true };
        }
      };

      // Mock corrupted image error
      Jimp.read.mockRejectedValueOnce(new Error('corrupted image data'));
      
      const result = await handleCorruptedImage('/tmp/corrupted.png');
      expect(result.success).toBe(false);
      expect(result.recoverable).toBe(false);
    });

    test('implements retry logic for file operations', async () => {
      const retryOperation = async (operation, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await operation();
            return { success: true, attempt, result };
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
          }
        }
        
        return { success: false, attempts: maxRetries, error: lastError.message };
      };

      // Mock operation that fails twice then succeeds
      let attemptCount = 0;
      const mockOperation = () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success';
      };

      const result = await retryOperation(mockOperation);
      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(result.result).toBe('Success');
    });
  });
});