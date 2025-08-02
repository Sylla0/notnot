#!/bin/bash

# NotNot Chrome Extension Build Script

set -e  # Exit on error

echo "🏗️  Building NotNot Chrome Extension..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build configuration
BUILD_DIR="dist"
ZIP_NAME="notnot-extension.zip"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous build...${NC}"
    rm -rf "$BUILD_DIR"
fi

# Create build directory
echo -e "${GREEN}Creating build directory...${NC}"
mkdir -p "$BUILD_DIR"

# Copy essential files
echo -e "${GREEN}Copying files...${NC}"

# Copy manifest
cp manifest.json "$BUILD_DIR/"

# Copy HTML files
mkdir -p "$BUILD_DIR/popup"
cp popup/popup.html "$BUILD_DIR/popup/"

mkdir -p "$BUILD_DIR/options"
cp options/options.html "$BUILD_DIR/options/"

mkdir -p "$BUILD_DIR/dashboard"
cp dashboard/dashboard.html "$BUILD_DIR/dashboard/"

# Copy and minify JavaScript files
echo -e "${GREEN}Processing JavaScript files...${NC}"

# Background script
mkdir -p "$BUILD_DIR/background"
cp background/service-worker.js "$BUILD_DIR/background/"

# Content scripts
mkdir -p "$BUILD_DIR/content-scripts"
cp content-scripts/notnot-content.js "$BUILD_DIR/content-scripts/"

# Popup script
cp popup/popup.js "$BUILD_DIR/popup/"

# Options script
cp options/options.js "$BUILD_DIR/options/"

# Dashboard script
cp dashboard/dashboard.js "$BUILD_DIR/dashboard/"

# Sidebar files
mkdir -p "$BUILD_DIR/sidebar"
cp sidebar/sidebar.html "$BUILD_DIR/sidebar/"
cp sidebar/sidebar.js "$BUILD_DIR/sidebar/"

# Copy and minify CSS files
echo -e "${GREEN}Processing CSS files...${NC}"

# Create assets directory
mkdir -p "$BUILD_DIR/assets/styles"
mkdir -p "$BUILD_DIR/assets/icons"

# Copy CSS files
cp assets/styles/content.css "$BUILD_DIR/assets/styles/"
cp popup/popup.css "$BUILD_DIR/popup/"
cp options/options.css "$BUILD_DIR/options/"
cp dashboard/dashboard.css "$BUILD_DIR/dashboard/"
cp sidebar/sidebar.css "$BUILD_DIR/sidebar/"

# Copy icons
cp -r assets/icons/*.png "$BUILD_DIR/assets/icons/" 2>/dev/null || echo "No icon files found"

# Remove development files and comments
echo -e "${GREEN}Cleaning up development artifacts...${NC}"

# Remove console.log statements from production build (optional)
if [ "$1" == "--prod" ]; then
    echo -e "${YELLOW}Production build: Removing console.log statements...${NC}"
    find "$BUILD_DIR" -name "*.js" -type f -exec sed -i 's/console\.log[^;]*;//g' {} \;
fi

# Create archive file
echo -e "${GREEN}Creating archive package...${NC}"
cd "$BUILD_DIR"
# Try zip first, fall back to tar if not available
if command -v zip &> /dev/null; then
    zip -r "../$ZIP_NAME" . -x "*.DS_Store" -x "__MACOSX/*"
else
    echo -e "${YELLOW}zip not found, creating tar.gz instead...${NC}"
    tar -czf "../notnot-extension.tar.gz" --exclude="*.DS_Store" .
    ZIP_NAME="notnot-extension.tar.gz"
fi
cd ..

# Calculate file sizes
ORIGINAL_SIZE=$(du -sh . --exclude="$BUILD_DIR" --exclude=".git" --exclude="old_modules" 2>/dev/null | cut -f1)
BUILD_SIZE=$(du -sh "$BUILD_DIR" 2>/dev/null | cut -f1)
ZIP_SIZE=$(du -h "$ZIP_NAME" 2>/dev/null | cut -f1)

# Build summary
echo -e "\n${GREEN}✅ Build completed successfully!${NC}"
echo -e "📦 Build directory: ${BUILD_DIR}/"
echo -e "🗜️  ZIP file: ${ZIP_NAME} (${ZIP_SIZE})"
echo -e "📊 Build size: ${BUILD_SIZE} (from ${ORIGINAL_SIZE})"

# Validation
echo -e "\n${GREEN}Validating build...${NC}"

# Check if all required files exist
REQUIRED_FILES=(
    "$BUILD_DIR/manifest.json"
    "$BUILD_DIR/background/service-worker.js"
    "$BUILD_DIR/content-scripts/notnot-content.js"
    "$BUILD_DIR/popup/popup.html"
)

ALL_GOOD=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All required files present${NC}"
fi

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the '${BUILD_DIR}' directory"
echo "   OR"
echo "   Drag and drop '${ZIP_NAME}' to install"