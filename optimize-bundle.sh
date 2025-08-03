#!/bin/bash

# NotNot Bundle Optimizer
# This script optimizes the bundle without webpack

echo "🚀 NotNot Bundle Optimizer"
echo "========================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create optimized directory
OPTIMIZED_DIR="dist-optimized"
rm -rf $OPTIMIZED_DIR
mkdir -p $OPTIMIZED_DIR

# Function to minify JavaScript
minify_js() {
    local input=$1
    local output=$2
    
    # Remove comments, empty lines, and excess whitespace
    sed -E '
        # Remove single line comments
        s|//[^"]*$||g
        # Remove multi-line comments
        s|/\*([^*]|\*[^/])*\*/||g
        # Remove console.log statements (production only)
        /console\.log/d
        # Remove empty lines
        /^[[:space:]]*$/d
        # Trim leading/trailing whitespace
        s/^[[:space:]]+//
        s/[[:space:]]+$//
        # Compress multiple spaces
        s/[[:space:]]+/ /g
    ' "$input" > "$output"
}

# Function to optimize content script using modules
create_optimized_content_script() {
    echo -e "${YELLOW}Creating optimized content script...${NC}"
    
    cat > "$OPTIMIZED_DIR/notnot-content-optimized.js" << 'EOF'
// NotNot Content Script - Optimized Bundle
(function() {
  'use strict';
  
  if (window.notnotContentScriptLoaded) return;
  window.notnotContentScriptLoaded = true;

EOF
    
    # Append constants
    echo "  // Constants" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    sed 's/export //g' content-scripts/modules/constants.js >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    echo "" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    
    # Append utils
    echo "  // Utilities" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    sed 's/export //g; s/import.*//g' content-scripts/modules/utils.js >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    echo "" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    
    # Append each module (removing imports/exports)
    for module in storage-manager area-selector capture-handler sidebar-ui overlay-injector video-detector; do
        echo "  // ${module}" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
        sed 's/export //g; s/import.*//g' "content-scripts/modules/${module}.js" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
        echo "" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    done
    
    # Append main initialization code
    echo "  // Initialize" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    sed '1,/window.notnotContentScriptLoaded = true;/d; s/import.*//g' content-scripts/main.js >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    
    echo "})();" >> "$OPTIMIZED_DIR/notnot-content-optimized.js"
    
    # Minify the result
    minify_js "$OPTIMIZED_DIR/notnot-content-optimized.js" "$OPTIMIZED_DIR/notnot-content.min.js"
}

# Calculate file sizes
get_size() {
    local file=$1
    if [ -f "$file" ]; then
        ls -lh "$file" | awk '{print $5}'
    else
        echo "N/A"
    fi
}

# Original size
ORIGINAL_SIZE=$(get_size "content-scripts/notnot-content.js")
ORIGINAL_LINES=$(wc -l < "content-scripts/notnot-content.js")

echo "Original file:"
echo "  Size: $ORIGINAL_SIZE"
echo "  Lines: $ORIGINAL_LINES"
echo ""

# Create optimized version
create_optimized_content_script

# Optimized sizes
OPTIMIZED_SIZE=$(get_size "$OPTIMIZED_DIR/notnot-content-optimized.js")
OPTIMIZED_LINES=$(wc -l < "$OPTIMIZED_DIR/notnot-content-optimized.js" 2>/dev/null || echo 0)
MINIFIED_SIZE=$(get_size "$OPTIMIZED_DIR/notnot-content.min.js")
MINIFIED_LINES=$(wc -l < "$OPTIMIZED_DIR/notnot-content.min.js" 2>/dev/null || echo 0)

echo -e "${GREEN}Optimization Complete!${NC}"
echo ""
echo "Optimized file:"
echo "  Size: $OPTIMIZED_SIZE"
echo "  Lines: $OPTIMIZED_LINES"
echo ""
echo "Minified file:"
echo "  Size: $MINIFIED_SIZE"
echo "  Lines: $MINIFIED_LINES"
echo ""

# Calculate reduction
if [ -f "$OPTIMIZED_DIR/notnot-content.min.js" ]; then
    ORIGINAL_BYTES=$(stat -f%z "content-scripts/notnot-content.js" 2>/dev/null || stat -c%s "content-scripts/notnot-content.js")
    MINIFIED_BYTES=$(stat -f%z "$OPTIMIZED_DIR/notnot-content.min.js" 2>/dev/null || stat -c%s "$OPTIMIZED_DIR/notnot-content.min.js")
    REDUCTION=$(( 100 - (MINIFIED_BYTES * 100 / ORIGINAL_BYTES) ))
    
    echo -e "${GREEN}Size reduction: ${REDUCTION}%${NC}"
fi

# Create a simple rollup alternative
echo ""
echo -e "${YELLOW}Creating simple bundle...${NC}"

cat > "$OPTIMIZED_DIR/notnot-bundle.js" << 'EOF'
// NotNot - Optimized Bundle
// This is a simple concatenation of all modules
// For production use, consider using webpack or rollup

(function() {
  'use strict';
  
  if (window.notnotContentScriptLoaded) return;
  window.notnotContentScriptLoaded = true;
  
  // Module: constants
EOF

# Simple concatenation without imports/exports
for file in constants utils storage-manager area-selector capture-handler sidebar-ui overlay-injector video-detector; do
    echo "  // Module: $file" >> "$OPTIMIZED_DIR/notnot-bundle.js"
    grep -v '^import\|^export' "content-scripts/modules/$file.js" >> "$OPTIMIZED_DIR/notnot-bundle.js"
    echo "" >> "$OPTIMIZED_DIR/notnot-bundle.js"
done

# Add initialization
echo "  // Initialization" >> "$OPTIMIZED_DIR/notnot-bundle.js"
grep -v '^import' content-scripts/main.js | tail -n +15 >> "$OPTIMIZED_DIR/notnot-bundle.js"
echo "})();" >> "$OPTIMIZED_DIR/notnot-bundle.js"

echo -e "${GREEN}✓ Bundle created successfully!${NC}"

# Create build info
cat > "$OPTIMIZED_DIR/build-info.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "original": {
    "file": "content-scripts/notnot-content.js",
    "size": "$ORIGINAL_SIZE",
    "lines": $ORIGINAL_LINES
  },
  "optimized": {
    "file": "notnot-content-optimized.js",
    "size": "$OPTIMIZED_SIZE",
    "lines": $OPTIMIZED_LINES
  },
  "minified": {
    "file": "notnot-content.min.js",
    "size": "$MINIFIED_SIZE",
    "lines": $MINIFIED_LINES
  },
  "reduction": "${REDUCTION}%"
}
EOF

echo ""
echo "Build info saved to: $OPTIMIZED_DIR/build-info.json"
echo ""
echo "To use the optimized version:"
echo "1. Copy $OPTIMIZED_DIR/notnot-bundle.js to content-scripts/"
echo "2. Update manifest.json to use the new file"
echo ""
echo "✨ Done!"