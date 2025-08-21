/**
 * Build Setup Script for Screenshot Tool
 * Creates necessary assets and runs installer builds
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ASSETS_DIR = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('✅ Created assets directory');
}

// Create a basic icon placeholder (you'll need to replace these with actual icons)
function createIconPlaceholder() {
    const iconNotice = `
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
2. Use online conversion tools such as:
   - Icon conversion websites for .ico format
   - Icon conversion websites for .icns format
   - Local tools like GIMP, ImageMagick, or iconutil (macOS)
3. Save icons as 'icon.ico' and 'icon.icns' in /assets folder

## Temporary Solution:
The build script will use Electron's default icon if custom icons are not found.
`;

    const iconReadmePath = path.join(ASSETS_DIR, 'ICON-SETUP.md');
    fs.writeFileSync(iconReadmePath, iconNotice.trim());
    console.log('📄 Created icon setup instructions');
}

// Function to run build commands
function runBuild(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔨 ${description}...`);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ ${description} failed:`, error.message);
                reject(error);
                return;
            }
            
            if (stderr) {
                console.log(`⚠️  Build warnings:\n${stderr}`);
            }
            
            console.log(`✅ ${description} completed successfully!`);
            if (stdout) {
                console.log(stdout);
            }
            resolve(stdout);
        });
    });
}

// Main setup function
async function setupBuild() {
    console.log('🚀 Screenshot Tool - Build Setup\n');
    
    try {
        // Create icon placeholder and instructions
        createIconPlaceholder();
        
        console.log('\n📋 Available build commands:');
        console.log('  npm run build:win     - Build Windows installer (.exe)');
        console.log('  npm run build:mac     - Build macOS installer (.dmg) - macOS only');
        console.log('  npm run build:all     - Build both Windows and macOS');
        console.log('  npm run build:portable - Build Windows portable app');
        
        console.log('\n💡 Next steps:');
        console.log('1. Add your icon files to /assets folder (see ICON-SETUP.md)');
        console.log('2. Run "npm run build:win" to create Windows installer');
        console.log('3. Installers will be created in /dist folder');
        
        console.log('\n🎯 Build setup complete!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupBuild();
}

module.exports = { setupBuild, runBuild };