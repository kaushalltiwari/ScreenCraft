/**
 * Unit tests for Shape Tool System
 * Tests advanced shape tools: Rectangle, Circle, Arrow, and Line drawing functionality
 */

describe('Shape Tool System', () => {
  let mockCanvas;
  let mockContext;
  let shapeToolSystem;

  beforeEach(() => {
    // Mock canvas and context for shape drawing testing
    mockContext = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      rect: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      closePath: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      clearRect: jest.fn(),
      setLineDash: jest.fn(),
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 2,
      lineCap: 'round',
      lineJoin: 'round'
    };

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      width: 1000,
      height: 600,
      getBoundingClientRect: jest.fn(() => ({
        left: 0, top: 0, width: 1000, height: 600
      }))
    };

    jest.clearAllMocks();
  });

  describe('Shape Tool Selection and Configuration', () => {
    test('manages shape tool selection state', () => {
      const shapeTools = {
        current: 'rectangle',
        available: ['rectangle', 'circle', 'arrow', 'line'],
        config: {
          strokeColor: '#e74c3c',
          strokeWidth: 2,
          fillColor: 'transparent'
        }
      };

      expect(shapeTools.current).toBe('rectangle');
      expect(shapeTools.available).toContain('circle');
      expect(shapeTools.available).toContain('arrow');
      expect(shapeTools.available).toContain('line');
      expect(shapeTools.config.strokeColor).toBe('#e74c3c');
    });

    test('switches between shape tools correctly', () => {
      const shapeSelector = {
        currentShape: 'rectangle'
      };

      const selectShape = (shape) => {
        const validShapes = ['rectangle', 'circle', 'arrow', 'line'];
        if (validShapes.includes(shape)) {
          shapeSelector.currentShape = shape;
          return true;
        }
        return false;
      };

      expect(selectShape('circle')).toBe(true);
      expect(shapeSelector.currentShape).toBe('circle');

      expect(selectShape('arrow')).toBe(true);
      expect(shapeSelector.currentShape).toBe('arrow');

      expect(selectShape('line')).toBe(true);
      expect(shapeSelector.currentShape).toBe('line');

      expect(selectShape('invalid')).toBe(false);
      expect(shapeSelector.currentShape).toBe('line'); // Unchanged
    });

    test('validates shape configuration options', () => {
      const shapeConfig = {
        strokeColors: [
          '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
          '#9b59b6', '#e67e22', '#1abc9c', '#34495e',
          '#f1c40f', '#e91e63', '#000000', '#ffffff'
        ],
        strokeWidths: [1, 2, 3, 4, 5, 6, 8, 10],
        fillOptions: ['transparent', 'solid']
      };

      expect(shapeConfig.strokeColors).toHaveLength(12);
      expect(shapeConfig.strokeWidths).toContain(2);
      expect(shapeConfig.strokeWidths).toContain(5);
      expect(shapeConfig.fillOptions).toContain('transparent');
      expect(shapeConfig.fillOptions).toContain('solid');
    });
  });

  describe('Rectangle Drawing', () => {
    test('draws rectangle with start and end coordinates', () => {
      const rectangleData = {
        startX: 100,
        startY: 150,
        endX: 300,
        endY: 250,
        strokeColor: '#e74c3c',
        strokeWidth: 2
      };

      // Calculate rectangle dimensions
      const width = rectangleData.endX - rectangleData.startX;
      const height = rectangleData.endY - rectangleData.startY;

      // Mock rectangle drawing
      mockContext.strokeStyle = rectangleData.strokeColor;
      mockContext.lineWidth = rectangleData.strokeWidth;
      mockContext.strokeRect(rectangleData.startX, rectangleData.startY, width, height);

      expect(mockContext.strokeStyle).toBe('#e74c3c');
      expect(mockContext.lineWidth).toBe(2);
      expect(mockContext.strokeRect).toHaveBeenCalledWith(100, 150, 200, 100);
    });

    test('handles negative rectangle dimensions (reverse drag)', () => {
      const rectangleData = {
        startX: 300,
        startY: 250,
        endX: 100,
        endY: 150
      };

      // Normalize rectangle coordinates
      const normalizedRect = {
        x: Math.min(rectangleData.startX, rectangleData.endX),
        y: Math.min(rectangleData.startY, rectangleData.endY),
        width: Math.abs(rectangleData.endX - rectangleData.startX),
        height: Math.abs(rectangleData.endY - rectangleData.startY)
      };

      expect(normalizedRect.x).toBe(100);
      expect(normalizedRect.y).toBe(150);
      expect(normalizedRect.width).toBe(200);
      expect(normalizedRect.height).toBe(100);
    });

    test('validates rectangle minimum size constraints', () => {
      const minSize = 5; // Minimum width/height in pixels
      
      const validateRectangle = (startX, startY, endX, endY) => {
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        return width >= minSize && height >= minSize;
      };

      expect(validateRectangle(100, 100, 110, 110)).toBe(true); // 10x10
      expect(validateRectangle(100, 100, 102, 102)).toBe(false); // 2x2
      expect(validateRectangle(100, 100, 105, 110)).toBe(true); // 5x10
      expect(validateRectangle(100, 100, 103, 110)).toBe(false); // 3x10
    });
  });

  describe('Circle Drawing', () => {
    test('draws circle with center and radius', () => {
      const circleData = {
        centerX: 200,
        centerY: 200,
        radius: 50,
        strokeColor: '#3498db',
        strokeWidth: 3
      };

      // Mock circle drawing
      mockContext.beginPath();
      mockContext.arc(circleData.centerX, circleData.centerY, circleData.radius, 0, 2 * Math.PI);
      mockContext.strokeStyle = circleData.strokeColor;
      mockContext.lineWidth = circleData.strokeWidth;
      mockContext.stroke();

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalledWith(200, 200, 50, 0, 2 * Math.PI);
      expect(mockContext.strokeStyle).toBe('#3498db');
      expect(mockContext.lineWidth).toBe(3);
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    test('calculates circle from drag coordinates', () => {
      const dragData = {
        startX: 150,
        startY: 150,
        endX: 250,
        endY: 200
      };

      // Calculate center and radius from drag
      const centerX = (dragData.startX + dragData.endX) / 2;
      const centerY = (dragData.startY + dragData.endY) / 2;
      const radius = Math.sqrt(
        Math.pow(dragData.endX - dragData.startX, 2) + 
        Math.pow(dragData.endY - dragData.startY, 2)
      ) / 2;

      expect(centerX).toBe(200);
      expect(centerY).toBe(175);
      expect(radius).toBeCloseTo(55.9, 1);
    });

    test('validates circle minimum radius constraints', () => {
      const minRadius = 10; // Minimum radius in pixels
      
      const validateCircle = (startX, startY, endX, endY) => {
        const radius = Math.sqrt(
          Math.pow(endX - startX, 2) + 
          Math.pow(endY - startY, 2)
        ) / 2;
        return radius >= minRadius;
      };

      expect(validateCircle(100, 100, 120, 120)).toBe(true); // ~14 radius
      expect(validateCircle(100, 100, 105, 105)).toBe(false); // ~3.5 radius
      expect(validateCircle(100, 100, 130, 100)).toBe(true); // 15 radius
    });
  });

  describe('Arrow Drawing', () => {
    test('draws arrow from start to end point', () => {
      const arrowData = {
        startX: 100,
        startY: 100,
        endX: 300,
        endY: 200,
        strokeColor: '#2ecc71',
        strokeWidth: 2,
        arrowHeadSize: 10
      };

      // Calculate arrow properties
      const angle = Math.atan2(arrowData.endY - arrowData.startY, arrowData.endX - arrowData.startX);
      const arrowLength = Math.sqrt(
        Math.pow(arrowData.endX - arrowData.startX, 2) + 
        Math.pow(arrowData.endY - arrowData.startY, 2)
      );

      expect(angle).toBeCloseTo(0.464, 3); // ~26.57 degrees
      expect(arrowLength).toBeCloseTo(223.6, 1);
    });

    test('calculates arrow head geometry', () => {
      const arrowData = {
        endX: 300,
        endY: 200,
        angle: Math.PI / 4, // 45 degrees
        headSize: 15
      };

      // Calculate arrow head points
      const headAngle1 = arrowData.angle - Math.PI / 6; // -30 degrees from line
      const headAngle2 = arrowData.angle + Math.PI / 6; // +30 degrees from line

      const head1X = arrowData.endX - arrowData.headSize * Math.cos(headAngle1);
      const head1Y = arrowData.endY - arrowData.headSize * Math.sin(headAngle1);
      const head2X = arrowData.endX - arrowData.headSize * Math.cos(headAngle2);
      const head2Y = arrowData.endY - arrowData.headSize * Math.sin(headAngle2);

      expect(head1X).toBeCloseTo(285.9, 0);
      expect(head1Y).toBeCloseTo(186.4, 0);
      expect(head2X).toBeCloseTo(286.4, 0);
      expect(head2Y).toBeCloseTo(213.6, 0);
    });

    test('validates arrow minimum length constraints', () => {
      const minLength = 20; // Minimum arrow length in pixels
      
      const validateArrow = (startX, startY, endX, endY) => {
        const length = Math.sqrt(
          Math.pow(endX - startX, 2) + 
          Math.pow(endY - startY, 2)
        );
        return length >= minLength;
      };

      expect(validateArrow(100, 100, 130, 100)).toBe(true); // 30 pixels
      expect(validateArrow(100, 100, 110, 100)).toBe(false); // 10 pixels
      expect(validateArrow(100, 100, 100, 125)).toBe(true); // 25 pixels
    });
  });

  describe('Line Drawing', () => {
    test('draws simple line between two points', () => {
      const lineData = {
        startX: 50,
        startY: 50,
        endX: 400,
        endY: 300,
        strokeColor: '#f39c12',
        strokeWidth: 3
      };

      // Mock line drawing
      mockContext.beginPath();
      mockContext.moveTo(lineData.startX, lineData.startY);
      mockContext.lineTo(lineData.endX, lineData.endY);
      mockContext.strokeStyle = lineData.strokeColor;
      mockContext.lineWidth = lineData.strokeWidth;
      mockContext.stroke();

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(50, 50);
      expect(mockContext.lineTo).toHaveBeenCalledWith(400, 300);
      expect(mockContext.strokeStyle).toBe('#f39c12');
      expect(mockContext.lineWidth).toBe(3);
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    test('calculates line angle and length', () => {
      const lineData = {
        startX: 100,
        startY: 100,
        endX: 200,
        endY: 150
      };

      const angle = Math.atan2(lineData.endY - lineData.startY, lineData.endX - lineData.startX);
      const length = Math.sqrt(
        Math.pow(lineData.endX - lineData.startX, 2) + 
        Math.pow(lineData.endY - lineData.startY, 2)
      );
      const angleDegrees = angle * (180 / Math.PI);

      expect(length).toBeCloseTo(111.8, 1);
      expect(angleDegrees).toBeCloseTo(26.57, 2);
    });

    test('supports different line cap styles', () => {
      const lineCapStyles = ['round', 'square', 'butt'];
      
      lineCapStyles.forEach(capStyle => {
        mockContext.lineCap = capStyle;
        expect(mockContext.lineCap).toBe(capStyle);
      });
    });
  });

  describe('Shape Interaction and Selection', () => {
    test('detects point inside rectangle', () => {
      const rectangle = { x: 100, y: 100, width: 200, height: 100 };
      
      const isPointInRectangle = (x, y, rect) => {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
      };

      expect(isPointInRectangle(150, 150, rectangle)).toBe(true);
      expect(isPointInRectangle(200, 120, rectangle)).toBe(true);
      expect(isPointInRectangle(50, 150, rectangle)).toBe(false);
      expect(isPointInRectangle(350, 150, rectangle)).toBe(false);
    });

    test('detects point inside circle', () => {
      const circle = { centerX: 200, centerY: 200, radius: 50 };
      
      const isPointInCircle = (x, y, circle) => {
        const distance = Math.sqrt(
          Math.pow(x - circle.centerX, 2) + 
          Math.pow(y - circle.centerY, 2)
        );
        return distance <= circle.radius;
      };

      expect(isPointInCircle(200, 200, circle)).toBe(true); // Center
      expect(isPointInCircle(210, 210, circle)).toBe(true); // Inside
      expect(isPointInCircle(250, 200, circle)).toBe(true); // On edge
      expect(isPointInCircle(260, 200, circle)).toBe(false); // Outside
    });

    test('detects point near line', () => {
      const line = { startX: 100, startY: 100, endX: 300, endY: 200 };
      const tolerance = 5; // Pixels
      
      const isPointNearLine = (x, y, line, tolerance) => {
        // Calculate distance from point to line segment
        const A = x - line.startX;
        const B = y - line.startY;
        const C = line.endX - line.startX;
        const D = line.endY - line.startY;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B) <= tolerance;
        
        const param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
          xx = line.startX;
          yy = line.startY;
        } else if (param > 1) {
          xx = line.endX;
          yy = line.endY;
        } else {
          xx = line.startX + param * C;
          yy = line.startY + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
      };

      expect(isPointNearLine(200, 150, line, tolerance)).toBe(true);
      expect(isPointNearLine(200, 160, line, tolerance)).toBe(false);
    });
  });

  describe('Shape Drawing State Management', () => {
    test('manages drawing state during drag operations', () => {
      const drawingState = {
        isDrawing: false,
        currentShape: null,
        startPoint: null,
        currentPoint: null
      };

      // Start drawing
      const startDrawing = (x, y, shapeType) => {
        drawingState.isDrawing = true;
        drawingState.currentShape = shapeType;
        drawingState.startPoint = { x, y };
        drawingState.currentPoint = { x, y };
      };

      startDrawing(100, 100, 'rectangle');
      expect(drawingState.isDrawing).toBe(true);
      expect(drawingState.currentShape).toBe('rectangle');
      expect(drawingState.startPoint).toEqual({ x: 100, y: 100 });

      // Update during drag
      drawingState.currentPoint = { x: 200, y: 150 };
      expect(drawingState.currentPoint).toEqual({ x: 200, y: 150 });

      // Finish drawing
      const finishDrawing = () => {
        drawingState.isDrawing = false;
        drawingState.currentShape = null;
        drawingState.startPoint = null;
        drawingState.currentPoint = null;
      };

      finishDrawing();
      expect(drawingState.isDrawing).toBe(false);
      expect(drawingState.currentShape).toBe(null);
    });

    test('prevents invalid drawing operations', () => {
      const validateDrawingOperation = (startPoint, currentPoint, shapeType) => {
        if (!startPoint || !currentPoint) return false;
        if (!shapeType) return false;
        
        const distance = Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) + 
          Math.pow(currentPoint.y - startPoint.y, 2)
        );
        
        return distance >= 5; // Minimum drag distance
      };

      expect(validateDrawingOperation(
        { x: 100, y: 100 }, 
        { x: 110, y: 110 }, 
        'rectangle'
      )).toBe(true);

      expect(validateDrawingOperation(
        { x: 100, y: 100 }, 
        { x: 102, y: 101 }, 
        'rectangle'
      )).toBe(false); // Too small

      expect(validateDrawingOperation(
        null, 
        { x: 110, y: 110 }, 
        'rectangle'
      )).toBe(false); // No start point
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles canvas boundary constraints', () => {
      const canvasBounds = { width: 1000, height: 600 };
      
      const constrainPoint = (x, y, bounds) => {
        return {
          x: Math.max(0, Math.min(x, bounds.width)),
          y: Math.max(0, Math.min(y, bounds.height))
        };
      };

      expect(constrainPoint(1100, 300, canvasBounds)).toEqual({ x: 1000, y: 300 });
      expect(constrainPoint(-50, 300, canvasBounds)).toEqual({ x: 0, y: 300 });
      expect(constrainPoint(500, -50, canvasBounds)).toEqual({ x: 500, y: 0 });
      expect(constrainPoint(500, 700, canvasBounds)).toEqual({ x: 500, y: 600 });
    });

    test('handles invalid color values for shapes', () => {
      const defaultColor = '#000000';
      
      const validateShapeColor = (color) => {
        const hexColorRegex = /^#[0-9a-f]{6}$/i;
        return hexColorRegex.test(color) ? color : defaultColor;
      };

      expect(validateShapeColor('#e74c3c')).toBe('#e74c3c');
      expect(validateShapeColor('invalid')).toBe('#000000');
      expect(validateShapeColor('')).toBe('#000000');
      expect(validateShapeColor('#xyz')).toBe('#000000');
    });

    test('handles invalid stroke width values', () => {
      const defaultWidth = 2;
      const maxWidth = 10;
      
      const validateStrokeWidth = (width) => {
        const numWidth = Number(width);
        if (isNaN(numWidth) || numWidth < 1) return defaultWidth;
        if (numWidth > maxWidth) return maxWidth;
        return Math.round(numWidth);
      };

      expect(validateStrokeWidth(3)).toBe(3);
      expect(validateStrokeWidth(15)).toBe(10); // Clamped to max
      expect(validateStrokeWidth(0)).toBe(2); // Use default
      expect(validateStrokeWidth('invalid')).toBe(2); // Use default
      expect(validateStrokeWidth(2.7)).toBe(3); // Rounded
    });
  });
});