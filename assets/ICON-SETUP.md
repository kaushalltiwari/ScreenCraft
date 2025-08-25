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

## Current Status:
✅ **Default Icon Available**: The app includes a programmatically generated icon
📁 **SVG Source Available**: `assets/icon.svg` contains the source design
🔧 **Generation Script**: `create-minimal-icon.js` can regenerate icons (excluded from git)

## How to Create Custom Icons:
1. **Option 1**: Edit `assets/icon.svg` and regenerate using the generation script
2. **Option 2**: Design a 1024x1024 PNG image of your app icon
3. **Option 3**: Use online conversion tools:
   - Icon conversion websites for .ico format
   - Icon conversion websites for .icns format  
   - Local tools like GIMP, ImageMagick, or iconutil (macOS)
4. Save icons as 'icon.ico' and 'icon.icns' in /assets folder

## Default Behavior:
The app currently uses a built-in programmatically generated icon with a minimalist screenshot tool design. Custom icons will override this default when present.