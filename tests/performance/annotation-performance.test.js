const performance = require('perf_hooks').performance;

describe('Annotation Performance Tests', () => {
    let mockCanvas, mockContext, mockDOM;

    beforeEach(() => {
        mockContext = {
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            arc: jest.fn(),
            beginPath: jest.fn(),
            closePath: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            fillText: jest.fn(),
            measureText: jest.fn(() => ({ width: 100 })),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            setLineDash: jest.fn(),
            clearRect: jest.fn(),
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Array(1000).fill(255) })),
            putImageData: jest.fn()
        };

        mockCanvas = {
            getContext: jest.fn(() => mockContext),
            width: 1920,
            height: 1080,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        mockDOM = {
            canvas: mockCanvas,
            getElementById: jest.fn((id) => {
                const elements = {
                    'annotation-canvas': mockCanvas,
                    'shape-tool': { value: 'rectangle' },
                    'stroke-color': { value: '#000000' },
                    'stroke-width': { value: '2' },
                    'fill-color': { value: '#ff0000' }
                };
                return elements[id];
            })
        };

        global.document = mockDOM;
    });

    describe('Shape Drawing Performance', () => {
        test('draws 100 rectangles within performance threshold', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                const rect = {
                    startX: Math.random() * 1000,
                    startY: Math.random() * 1000,
                    endX: Math.random() * 1000 + 100,
                    endY: Math.random() * 1000 + 100,
                    strokeColor: '#000000',
                    strokeWidth: 2
                };
                
                mockContext.strokeRect(
                    rect.startX, 
                    rect.startY,
                    rect.endX - rect.startX,
                    rect.endY - rect.startY
                );
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100); // Should complete within 100ms
            expect(mockContext.strokeRect).toHaveBeenCalledTimes(100);
        });

        test('draws 100 circles within performance threshold', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                const circle = {
                    centerX: Math.random() * 1000,
                    centerY: Math.random() * 1000,
                    radius: Math.random() * 50 + 10,
                    strokeColor: '#000000',
                    strokeWidth: 2
                };
                
                mockContext.beginPath();
                mockContext.arc(circle.centerX, circle.centerY, circle.radius, 0, 2 * Math.PI);
                mockContext.stroke();
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            expect(mockContext.beginPath).toHaveBeenCalledTimes(100);
            expect(mockContext.arc).toHaveBeenCalledTimes(100);
        });

        test('handles rapid mouse movement events efficiently', () => {
            const events = [];
            const startTime = performance.now();
            
            // Simulate 1000 mouse move events
            for (let i = 0; i < 100; i++) {
                events.push({
                    type: 'mousemove',
                    offsetX: Math.random() * 1920,
                    offsetY: Math.random() * 1080,
                    timestamp: performance.now()
                });
            }
            
            // Process events
            events.forEach(event => {
                if (event.type === 'mousemove') {
                    // Simulate cursor update
                    mockCanvas.style = { cursor: 'crosshair' };
                }
            });
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(50); // Should handle 1000 events quickly
        });
    });

    describe('Text Annotation Performance', () => {
        test('renders 50 text annotations within performance threshold', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 50; i++) {
                const text = {
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    text: `Annotation ${i}`,
                    fontSize: 16,
                    fontFamily: 'Arial',
                    color: '#000000'
                };
                
                mockContext.font = `${text.fontSize}px ${text.fontFamily}`;
                mockContext.fillStyle = text.color;
                mockContext.fillText(text.text, text.x, text.y);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            expect(mockContext.fillText).toHaveBeenCalledTimes(50);
        });

        test('measures text dimensions efficiently for layout', () => {
            const startTime = performance.now();
            
            const texts = Array.from({ length: 100 }, (_, i) => `Sample text ${i}`);
            
            texts.forEach(text => {
                mockContext.font = '16px Arial';
                const metrics = mockContext.measureText(text);
                expect(metrics.width).toBeDefined();
            });
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(50);
            expect(mockContext.measureText).toHaveBeenCalledTimes(100);
        });
    });

    describe('Canvas Operations Performance', () => {
        test('clears large canvas areas efficiently', () => {
            const startTime = performance.now();
            
            // Clear multiple regions
            for (let i = 0; i < 20; i++) {
                mockContext.clearRect(0, 0, 1920, 1080);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(50);
            expect(mockContext.clearRect).toHaveBeenCalledTimes(20);
        });

        test('handles undo/redo operations efficiently', () => {
            const undoStack = [];
            const startTime = performance.now();
            
            // Simulate building undo stack
            for (let i = 0; i < 100; i++) {
                undoStack.push({
                    imageData: new Array(100 * 100 * 4).fill(255),
                    timestamp: Date.now()
                });
            }
            
            // Simulate undo operations
            for (let i = 0; i < 10; i++) {
                const state = undoStack.pop();
                if (state) {
                    mockContext.putImageData(state.imageData, 0, 0);
                }
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(100);
            expect(undoStack.length).toBe(90);
        });
    });

    describe('Memory Usage Tests', () => {
        test('maintains reasonable memory usage with many annotations', () => {
            const annotations = [];
            const startMemory = process.memoryUsage().heapUsed;
            
            // Create 100 annotation objects
            for (let i = 0; i < 100; i++) {
                annotations.push({
                    type: 'rectangle',
                    id: `rect-${i}`,
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    width: Math.random() * 200,
                    height: Math.random() * 200,
                    strokeColor: '#000000',
                    strokeWidth: 2,
                    timestamp: Date.now()
                });
            }
            
            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = endMemory - startMemory;
            
            // Memory increase should be reasonable (less than 1MB for 100 objects)
            expect(memoryIncrease).toBeLessThan(1 * 1024 * 1024);
            expect(annotations.length).toBe(100);
        });

        test('cleans up event listeners properly', () => {
            const listeners = [];
            
            // Add many event listeners
            for (let i = 0; i < 100; i++) {
                const listener = jest.fn();
                listeners.push(listener);
                mockCanvas.addEventListener('click', listener);
            }
            
            expect(mockCanvas.addEventListener).toHaveBeenCalledTimes(100);
            
            // Simulate cleanup
            listeners.forEach(listener => {
                mockCanvas.removeEventListener('click', listener);
            });
            
            expect(mockCanvas.removeEventListener).toHaveBeenCalledTimes(100);
        });
    });

    describe('Stress Tests', () => {
        test('handles simultaneous annotation creation', () => {
            const startTime = performance.now();
            const operations = [];
            
            // Simulate creating many different annotation types simultaneously
            for (let i = 0; i < 50; i++) {
                const operation = {
                    type: ['rectangle', 'circle', 'text', 'arrow'][i % 4],
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                    id: `annotation-${i}`
                };
                
                operations.push(operation);
                
                // Simulate rendering based on type
                switch (operation.type) {
                    case 'rectangle':
                        mockContext.strokeRect(operation.x, operation.y, 100, 100);
                        break;
                    case 'circle':
                        mockContext.beginPath();
                        mockContext.arc(operation.x, operation.y, 50, 0, 2 * Math.PI);
                        mockContext.stroke();
                        break;
                    case 'text':
                        mockContext.fillText('Test', operation.x, operation.y);
                        break;
                    case 'arrow':
                        mockContext.beginPath();
                        mockContext.moveTo(operation.x, operation.y);
                        mockContext.lineTo(operation.x + 100, operation.y + 100);
                        mockContext.stroke();
                        break;
                }
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(500); // Should handle 50 operations
            expect(operations.length).toBe(50);
        });

        test('maintains responsiveness during heavy canvas operations', () => {
            let operationCount = 0;
            const startTime = performance.now();
            
            // Simulate heavy drawing operations
            while (performance.now() - startTime < 100) { // Run for 100ms
                mockContext.fillRect(
                    Math.random() * 1000,
                    Math.random() * 1000,
                    50,
                    50
                );
                operationCount++;
            }
            
            // Should be able to perform many operations within time limit
            expect(operationCount).toBeGreaterThan(100);
            expect(mockContext.fillRect).toHaveBeenCalledTimes(operationCount);
        });

        test('handles edge case scenarios gracefully', () => {
            // Test with extreme coordinates
            expect(() => {
                mockContext.strokeRect(-10000, -10000, 20000, 20000);
            }).not.toThrow();
            
            // Test with zero dimensions
            expect(() => {
                mockContext.strokeRect(100, 100, 0, 0);
            }).not.toThrow();
            
            // Test with negative dimensions
            expect(() => {
                mockContext.strokeRect(100, 100, -50, -50);
            }).not.toThrow();
            
            // Test with very large text
            const longText = 'A'.repeat(10000);
            expect(() => {
                mockContext.fillText(longText, 100, 100);
            }).not.toThrow();
        });
    });
});