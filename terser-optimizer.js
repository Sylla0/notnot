#!/usr/bin/env node
// Simple JavaScript optimizer using regex
const fs = require('fs');
const path = require('path');

function optimizeJS(code) {
  // Remove comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line comments
  code = code.replace(/\/\/.*$/gm, ''); // Single-line comments
  
  // Remove console.log statements
  code = code.replace(/console\.log\([^)]*\);?/g, '');
  code = code.replace(/console\.debug\([^)]*\);?/g, '');
  code = code.replace(/console\.info\([^)]*\);?/g, '');
  
  // Remove empty lines and trim whitespace
  code = code.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Compress whitespace around operators
  code = code.replace(/\s*([=+\-*/%<>!&|,;:{}()])\s*/g, '$1');
  
  // Restore necessary spaces
  code = code.replace(/\bfunction\b/g, 'function ');
  code = code.replace(/\breturn\b/g, 'return ');
  code = code.replace(/\bif\b/g, 'if ');
  code = code.replace(/\belse\b/g, 'else ');
  code = code.replace(/\bfor\b/g, 'for ');
  code = code.replace(/\bwhile\b/g, 'while ');
  code = code.replace(/\bconst\b/g, 'const ');
  code = code.replace(/\blet\b/g, 'let ');
  code = code.replace(/\bvar\b/g, 'var ');
  code = code.replace(/\bnew\b/g, 'new ');
  code = code.replace(/\bthrow\b/g, 'throw ');
  code = code.replace(/\btry\b/g, 'try ');
  code = code.replace(/\bcatch\b/g, 'catch ');
  code = code.replace(/\basync\b/g, 'async ');
  code = code.replace(/\bawait\b/g, 'await ');
  code = code.replace(/\bclass\b/g, 'class ');
  code = code.replace(/\bextends\b/g, ' extends ');
  code = code.replace(/\bstatic\b/g, 'static ');
  
  return code;
}

// Create optimized bundle
function createBundle() {
  const modules = [
    'constants',
    'utils', 
    'storage-manager',
    'area-selector',
    'capture-handler',
    'sidebar-ui',
    'overlay-injector',
    'video-detector'
  ];
  
  let bundle = `// NotNot Chrome Extension - Optimized Bundle
// Generated: ${new Date().toISOString()}
(function() {
'use strict';

if (window.notnotContentScriptLoaded) return;
window.notnotContentScriptLoaded = true;

`;

  // Add each module
  modules.forEach(moduleName => {
    const modulePath = path.join(__dirname, 'content-scripts/modules', `${moduleName}.js`);
    if (fs.existsSync(modulePath)) {
      let moduleCode = fs.readFileSync(modulePath, 'utf8');
      
      // Remove imports and exports
      moduleCode = moduleCode.replace(/^import\s+.*$/gm, '');
      moduleCode = moduleCode.replace(/^export\s+/gm, '');
      moduleCode = moduleCode.replace(/export\s*{[^}]*}/g, '');
      
      bundle += `// Module: ${moduleName}\n`;
      bundle += moduleCode + '\n\n';
    }
  });
  
  // Add main initialization
  const mainPath = path.join(__dirname, 'content-scripts/main.js');
  if (fs.existsSync(mainPath)) {
    let mainCode = fs.readFileSync(mainPath, 'utf8');
    
    // Remove imports
    mainCode = mainCode.replace(/^import\s+.*$/gm, '');
    
    // Extract only initialization code
    const initStart = mainCode.indexOf('// Initialize video detector');
    if (initStart > -1) {
      mainCode = mainCode.substring(initStart);
    }
    
    bundle += '// Initialize\n';
    bundle += mainCode;
  }
  
  bundle += '\n})();';
  
  return bundle;
}

// Main execution
const outputDir = 'dist-optimized';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

console.log('Creating optimized bundle...');
const bundle = createBundle();
const optimized = optimizeJS(bundle);

// Write files
fs.writeFileSync(path.join(outputDir, 'notnot-content.js'), bundle);
fs.writeFileSync(path.join(outputDir, 'notnot-content.min.js'), optimized);

// Calculate sizes
const originalSize = fs.statSync('content-scripts/notnot-content.js').size;
const bundleSize = Buffer.byteLength(bundle);
const minSize = Buffer.byteLength(optimized);

console.log(`\nOriginal: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`Bundle: ${(bundleSize / 1024).toFixed(2)} KB`);
console.log(`Minified: ${(minSize / 1024).toFixed(2)} KB`);
console.log(`Reduction: ${((1 - minSize / originalSize) * 100).toFixed(1)}%`);

console.log('\n✅ Optimization complete!');
console.log(`Output: ${outputDir}/notnot-content.min.js`);