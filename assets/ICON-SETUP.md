# 📝 ICON SETUP REQUIRED

To build installers, you need to add the following icon files to the /assets folder:

## Windows Icons:
- **icon.ico** (256x256 pixels recommended)
  - Use online converters or tools like GIMP to create .ico files
  - Include multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

## macOS Icons:
- **icon.icns** (1024x1024 pixels recommended)  
  - Use 'iconutil' on macOS or online converters
  - Should include multiple sizes for Retina displays

## Optional Assets:
- **dmg-background.png** (540x380 pixels) - Background image for macOS DMG installer

## How to Create Icons:
1. Design a 1024x1024 PNG image of your app icon
2. Use online tools like:
   - https://icoconvert.com/ (for .ico)
   - https://iconverticons.com/ (for .icns)
3. Save icons as 'icon.ico' and 'icon.icns' in /assets folder

## Temporary Solution:
The build script will use Electron's default icon if custom icons are not found.