const { nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

function createMinimalistIcon(size = 256) {
  // Create a canvas-like buffer for our icon
  const buffer = Buffer.alloc(size * size * 4); // RGBA
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 8; // Outer circle radius
  
  // Helper function to set pixel
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const index = (y * size + x) * 4;
    buffer[index] = r;     // R
    buffer[index + 1] = g; // G
    buffer[index + 2] = b; // B
    buffer[index + 3] = a; // A
  }
  
  // Helper function to draw circle outline
  function drawCircle(cx, cy, r, r_val, g_val, b_val, thickness = 1) {
    for (let angle = 0; angle < 360; angle += 0.5) {
      const rad = (angle * Math.PI) / 180;
      for (let t = 0; t < thickness; t++) {
        const x = Math.floor(cx + (r + t) * Math.cos(rad));
        const y = Math.floor(cy + (r + t) * Math.sin(rad));
        setPixel(x, y, r_val, g_val, b_val);
      }
    }
  }
  
  // Helper function to fill circle
  function fillCircle(cx, cy, r, r_val, g_val, b_val) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= r) {
          // Create gradient effect
          const gradient = 1 - (distance / r);
          const finalR = Math.floor(r_val * gradient + (r_val * 0.7) * (1 - gradient));
          const finalG = Math.floor(g_val * gradient + (g_val * 0.7) * (1 - gradient));
          const finalB = Math.floor(b_val * gradient + (b_val * 0.7) * (1 - gradient));
          setPixel(x, y, finalR, finalG, finalB);
        }
      }
    }
  }
  
  // Helper function to draw rectangle
  function drawRect(x1, y1, w, h, r_val, g_val, b_val, filled = false) {
    if (filled) {
      for (let y = y1; y < y1 + h; y++) {
        for (let x = x1; x < x1 + w; x++) {
          setPixel(x, y, r_val, g_val, b_val);
        }
      }
    } else {
      // Draw outline
      for (let x = x1; x < x1 + w; x++) {
        setPixel(x, y1, r_val, g_val, b_val); // Top
        setPixel(x, y1 + h - 1, r_val, g_val, b_val); // Bottom
      }
      for (let y = y1; y < y1 + h; y++) {
        setPixel(x1, y, r_val, g_val, b_val); // Left
        setPixel(x1 + w - 1, y, r_val, g_val, b_val); // Right
      }
    }
  }
  
  // Draw background circle with gradient
  fillCircle(centerX, centerY, radius, 102, 126, 234); // Blue gradient
  
  // Draw border
  drawCircle(centerX, centerY, radius - 2, 67, 56, 202, 3); // Darker blue border
  
  // Calculate screen dimensions
  const screenW = size * 0.5;
  const screenH = size * 0.375;
  const screenX = centerX - screenW / 2;
  const screenY = centerY - screenH / 2;
  
  // Draw screen background
  drawRect(screenX, screenY, screenW, screenH, 248, 250, 252, true); // Light background
  
  // Draw screen border
  drawRect(screenX - 2, screenY - 2, screenW + 4, screenH + 4, 51, 65, 85); // Dark border
  
  // Draw selection area (dashed effect by drawing segments)
  const selW = screenW * 0.75;
  const selH = screenH * 0.67;
  const selX = screenX + (screenW - selW) / 2;
  const selY = screenY + (screenH - selH) / 2;
  
  // Draw dashed selection rectangle
  const dashLength = 6;
  const gapLength = 4;
  const totalLength = dashLength + gapLength;
  
  // Top and bottom dashes
  for (let x = 0; x < selW; x += totalLength) {
    const endX = Math.min(x + dashLength, selW);
    for (let i = x; i < endX; i++) {
      setPixel(selX + i, selY, 99, 102, 241); // Top
      setPixel(selX + i, selY + selH - 1, 99, 102, 241); // Bottom
    }
  }
  
  // Left and right dashes
  for (let y = 0; y < selH; y += totalLength) {
    const endY = Math.min(y + dashLength, selH);
    for (let i = y; i < endY; i++) {
      setPixel(selX, selY + i, 99, 102, 241); // Left
      setPixel(selX + selW - 1, selY + i, 99, 102, 241); // Right
    }
  }
  
  // Draw corner handles
  const handleSize = 3;
  const corners = [
    [selX, selY],
    [selX + selW, selY],
    [selX, selY + selH],
    [selX + selW, selY + selH]
  ];
  
  corners.forEach(([x, y]) => {
    fillCircle(x, y, handleSize, 99, 102, 241);
  });
  
  // Draw center shutter
  fillCircle(centerX, centerY, 12, 99, 102, 241); // Outer shutter
  drawCircle(centerX, centerY, 8, 255, 255, 255, 2); // Inner ring
  
  // Add some sparkle effects
  const sparkles = [
    [size * 0.25, size * 0.2, 2],
    [size * 0.75, size * 0.25, 1],
    [size * 0.8, size * 0.7, 2],
    [size * 0.2, size * 0.8, 1]
  ];
  
  sparkles.forEach(([x, y, r]) => {
    fillCircle(x, y, r, 255, 255, 255);
  });
  
  return buffer;
}

// Create icons of different sizes
const sizes = [16, 32, 48, 64, 128, 256];
const assetsDir = path.join(__dirname);

console.log('Creating minimalist screenshot icons...');

sizes.forEach(size => {
  const iconBuffer = createMinimalistIcon(size);
  const image = nativeImage.createFromBuffer(iconBuffer, { width: size, height: size });
  const pngBuffer = image.toPNG();
  
  const filename = size === 256 ? 'icon.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(assetsDir, filename), pngBuffer);
  
  console.log(`✅ Created ${filename} (${size}x${size})`);
});

console.log('\\n🎉 All icons created successfully!');
console.log('\\n📝 Next steps:');
console.log('1. Use icon.png for taskbar/tray');
console.log('2. Convert icon.png to ICO format for Windows installer:');
console.log('   - Use local tools like GIMP, ImageMagick, or online converters');
console.log('   - Save as assets/icon.ico');
console.log('3. Convert icon.png to ICNS format for macOS installer:');
console.log('   - Use iconutil on macOS or conversion tools');
console.log('   - Save as assets/icon.icns');

module.exports = { createMinimalistIcon };