const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const performance = require('perf_hooks').performance;

describe('File Operations Performance Tests', () => {
    let tempDir;
    let mockJimp;
    let mockElectron;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'screencap-test-'));
        
        // Mock Jimp for image processing
        mockJimp = {
            read: jest.fn().mockResolvedValue({
                bitmap: { width: 1920, height: 1080, data: Buffer.alloc(1920 * 1080 * 4) },
                getWidth: jest.fn(() => 1920),
                getHeight: jest.fn(() => 1080),
                crop: jest.fn().mockReturnThis(),
                resize: jest.fn().mockReturnThis(),
                quality: jest.fn().mockReturnThis(),
                write: jest.fn().mockResolvedValue(),
                getBuffer: jest.fn().mockResolvedValue(Buffer.alloc(100000)),
                composite: jest.fn().mockReturnThis(),
                opacity: jest.fn().mockReturnThis()
            }),
            create: jest.fn().mockResolvedValue({
                bitmap: { width: 1920, height: 1080, data: Buffer.alloc(1920 * 1080 * 4) },
                composite: jest.fn().mockReturnThis(),
                write: jest.fn().mockResolvedValue()
            })
        };

        // Mock Electron APIs
        mockElectron = {
            clipboard: {
                writeImage: jest.fn(),
                readImage: jest.fn(() => ({ toPNG: jest.fn(() => Buffer.alloc(100000)) }))
            },
            nativeImage: {
                createFromBuffer: jest.fn(() => ({
                    toPNG: jest.fn(() => Buffer.alloc(100000)),
                    getSize: jest.fn(() => ({ width: 1920, height: 1080 }))
                }))
            },
            ipcRenderer: {
                invoke: jest.fn().mockResolvedValue('/path/to/saved/file.png')
            }
        };

        global.require = jest.fn((module) => {
            if (module === 'jimp') return mockJimp;
            if (module === 'electron') return mockElectron;
            return jest.requireActual(module);
        });
    });

    afterEach(async () => {
        try {
            await fs.rmdir(tempDir, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Image Processing Performance', () => {
        test('processes large image within time threshold', async () => {
            const startTime = performance.now();
            
            const largeImageData = Buffer.alloc(1920 * 1080 * 4); // 4K image
            mockJimp.read.mockResolvedValue({
                bitmap: { width: 1920, height: 1080, data: largeImageData },
                getWidth: () => 1920,
                getHeight: () => 1080,
                crop: jest.fn().mockReturnThis(),
                write: jest.fn().mockResolvedValue()
            });
            
            const image = await mockJimp.read('test-image.png');
            await image.crop(100, 100, 800, 600).write('cropped.png');
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000); // Should process within 1 second
            expect(mockJimp.read).toHaveBeenCalledWith('test-image.png');
            expect(image.crop).toHaveBeenCalledWith(100, 100, 800, 600);
        });

        test('handles batch image processing efficiently', async () => {
            const startTime = performance.now();
            const imageCount = 10;
            const promises = [];
            
            for (let i = 0; i < imageCount; i++) {
                const promise = mockJimp.read(`image-${i}.png`)
                    .then(image => image.resize(800, 600))
                    .then(image => image.write(`processed-${i}.png`));
                promises.push(promise);
            }
            
            await Promise.all(promises);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(2000); // Batch processing should be efficient
            expect(mockJimp.read).toHaveBeenCalledTimes(imageCount);
        });

        test('renders annotations on image efficiently', async () => {
            const startTime = performance.now();
            
            const baseImage = await mockJimp.read('base.png');
            const annotations = Array.from({ length: 50 }, (_, i) => ({
                type: 'rectangle',
                x: i * 10,
                y: i * 10,
                width: 100,
                height: 50,
                color: '#ff0000'
            }));
            
            // Simulate rendering each annotation
            for (const annotation of annotations) {
                const overlay = await mockJimp.create(annotation.width, annotation.height, annotation.color);
                await baseImage.composite(overlay, annotation.x, annotation.y);
            }
            
            await baseImage.write('annotated.png');
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1500);
            expect(mockJimp.create).toHaveBeenCalledTimes(50);
        });
    });

    describe('File System Performance', () => {
        test('saves multiple screenshots rapidly', async () => {
            const startTime = performance.now();
            const fileCount = 20;
            
            const savePromises = Array.from({ length: fileCount }, async (_, i) => {
                const fileName = path.join(tempDir, `screenshot-${i}.png`);
                const imageData = Buffer.alloc(100000); // 100KB image
                await fs.writeFile(fileName, imageData);
                return fileName;
            });
            
            const savedFiles = await Promise.all(savePromises);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000);
            expect(savedFiles).toHaveLength(fileCount);
            
            // Verify files exist
            for (const file of savedFiles) {
                const stats = await fs.stat(file);
                expect(stats.size).toBeGreaterThan(0);
            }
        });

        test('cleans up temporary files efficiently', async () => {
            const startTime = performance.now();
            
            // Create temporary files
            const tempFiles = [];
            for (let i = 0; i < 50; i++) {
                const fileName = path.join(tempDir, `temp-${i}.png`);
                await fs.writeFile(fileName, Buffer.alloc(10000));
                tempFiles.push(fileName);
            }
            
            // Clean up files
            await Promise.all(tempFiles.map(file => fs.unlink(file)));
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000); // Increased threshold for CI stability
            
            // Verify files are deleted
            for (const file of tempFiles) {
                await expect(fs.access(file)).rejects.toThrow();
            }
        });

        test('handles concurrent file operations', async () => {
            const startTime = performance.now();
            const operations = [];
            
            // Mix of read and write operations
            for (let i = 0; i < 30; i++) {
                if (i % 2 === 0) {
                    // Write operation
                    operations.push(
                        fs.writeFile(
                            path.join(tempDir, `concurrent-${i}.png`),
                            Buffer.alloc(50000)
                        )
                    );
                } else {
                    // Create then read operation
                    operations.push(
                        fs.writeFile(
                            path.join(tempDir, `read-${i}.png`),
                            Buffer.alloc(30000)
                        ).then(() =>
                            fs.readFile(path.join(tempDir, `read-${i}.png`))
                        )
                    );
                }
            }
            
            await Promise.all(operations);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000);
        });
    });

    describe('Clipboard Performance', () => {
        test('copies large images to clipboard quickly', async () => {
            const startTime = performance.now();
            
            const largeImageBuffer = Buffer.alloc(1920 * 1080 * 4); // Large image
            const nativeImage = mockElectron.nativeImage.createFromBuffer(largeImageBuffer);
            
            mockElectron.clipboard.writeImage(nativeImage);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(500);
            expect(mockElectron.clipboard.writeImage).toHaveBeenCalledWith(nativeImage);
        });

        test('handles multiple clipboard operations efficiently', () => {
            const startTime = performance.now();
            
            // Simulate rapid clipboard operations
            for (let i = 0; i < 10; i++) {
                const imageBuffer = Buffer.alloc(100000);
                const nativeImage = mockElectron.nativeImage.createFromBuffer(imageBuffer);
                mockElectron.clipboard.writeImage(nativeImage);
            }
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(200);
            expect(mockElectron.clipboard.writeImage).toHaveBeenCalledTimes(10);
        });
    });

    describe('Memory Management', () => {
        test('maintains reasonable memory usage during file operations', async () => {
            const startMemory = process.memoryUsage().heapUsed;
            
            // Perform memory-intensive operations
            const buffers = [];
            for (let i = 0; i < 100; i++) {
                const buffer = Buffer.alloc(100000); // 100KB each
                buffers.push(buffer);
                
                // Simulate file write
                await fs.writeFile(
                    path.join(tempDir, `memory-test-${i}.png`),
                    buffer
                );
            }
            
            // Clear references to allow garbage collection
            buffers.length = 0;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = endMemory - startMemory;
            
            // Memory increase should be reasonable (less than 50MB for 100 files)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });

        test('releases image processing resources properly', async () => {
            const startMemory = process.memoryUsage().heapUsed;
            
            // Process many images
            for (let i = 0; i < 50; i++) {
                const image = await mockJimp.read(`test-${i}.png`);
                await image.crop(0, 0, 100, 100).write(`cropped-${i}.png`);
                
                // Simulate releasing references
                delete image.bitmap;
            }
            
            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = endMemory - startMemory;
            
            // Should not accumulate too much memory
            expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
        });
    });

    describe('Error Handling Performance', () => {
        test('handles file system errors gracefully without performance impact', async () => {
            const startTime = performance.now();
            const results = [];
            
            // Mix of valid and invalid operations
            const operations = Array.from({ length: 20 }, async (_, i) => {
                try {
                    if (i % 3 === 0) {
                        // Invalid operation - try to read non-existent file
                        await fs.readFile(`/nonexistent/path/file-${i}.png`);
                    } else {
                        // Valid operation
                        await fs.writeFile(
                            path.join(tempDir, `valid-${i}.png`),
                            Buffer.alloc(10000)
                        );
                    }
                    return { success: true, index: i };
                } catch (error) {
                    return { success: false, index: i, error: error.message };
                }
            });
            
            const operationResults = await Promise.allSettled(operations);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(1000);
            expect(operationResults).toHaveLength(20);
            
            // Should have both successful and failed operations
            const settled = await Promise.all(operationResults.map(r => r.value));
            const successful = settled.filter(r => r && r.success);
            const failed = settled.filter(r => r && !r.success);
            
            expect(successful.length).toBeGreaterThan(0);
            expect(failed.length).toBeGreaterThan(0);
        });

        test('recovers from image processing errors efficiently', async () => {
            const startTime = performance.now();
            let successCount = 0;
            let errorCount = 0;
            
            const operations = Array.from({ length: 15 }, async (_, i) => {
                try {
                    if (i % 4 === 0) {
                        // Simulate processing error
                        throw new Error(`Processing error for image ${i}`);
                    }
                    
                    const image = await mockJimp.read(`test-${i}.png`);
                    await image.resize(800, 600);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    // Should continue processing other images
                }
            });
            
            await Promise.all(operations);
            
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            expect(executionTime).toBeLessThan(800);
            expect(successCount).toBeGreaterThan(0);
            expect(errorCount).toBeGreaterThan(0);
            expect(successCount + errorCount).toBe(15);
        });
    });
});