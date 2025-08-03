#!/usr/bin/env python3
"""
NotNot Bundle Optimizer
Optimizes JavaScript bundle size by removing comments, console.logs, and unnecessary whitespace
"""

import os
import re
import json
from datetime import datetime

def remove_comments(code):
    """Remove JavaScript comments"""
    # Remove multi-line comments
    code = re.sub(r'/\*[\s\S]*?\*/', '', code)
    # Remove single-line comments (but not URLs)
    code = re.sub(r'(?<!:)//.*$', '', code, flags=re.MULTILINE)
    return code

def remove_console_logs(code):
    """Remove console.log statements"""
    # Remove console.log, console.debug, console.info
    code = re.sub(r'console\.(log|debug|info)\([^)]*\);?', '', code)
    return code

def remove_empty_lines(code):
    """Remove empty lines and excessive whitespace"""
    # Remove empty lines
    lines = [line.strip() for line in code.split('\n') if line.strip()]
    return '\n'.join(lines)

def compress_whitespace(code):
    """Compress whitespace around operators"""
    # Compress spaces around operators
    code = re.sub(r'\s*([=+\-*/%<>!&|,;:{}()])\s*', r'\1', code)
    
    # Restore necessary spaces
    keywords = ['function', 'return', 'if', 'else', 'for', 'while', 'const', 'let', 'var', 
                'new', 'throw', 'try', 'catch', 'async', 'await', 'class', 'extends', 'static',
                'typeof', 'instanceof', 'in', 'of']
    
    for keyword in keywords:
        code = re.sub(rf'\b{keyword}\b', f'{keyword} ', code)
    
    # Fix specific patterns
    code = re.sub(r'else\s+if', 'else if', code)
    code = re.sub(r'\s+extends\s+', ' extends ', code)
    
    return code

def create_bundle():
    """Create optimized bundle from modules"""
    modules = [
        'constants',
        'utils',
        'storage-manager',
        'area-selector', 
        'capture-handler',
        'sidebar-ui',
        'overlay-injector',
        'video-detector'
    ]
    
    bundle = """// NotNot Chrome Extension - Optimized Bundle
// Generated: {}
(function() {{
'use strict';

if (window.notnotContentScriptLoaded) return;
window.notnotContentScriptLoaded = true;

""".format(datetime.now().isoformat())
    
    # Add each module
    for module in modules:
        module_path = f'content-scripts/modules/{module}.js'
        if os.path.exists(module_path):
            with open(module_path, 'r', encoding='utf-8') as f:
                module_code = f.read()
            
            # Remove imports and exports
            module_code = re.sub(r'^import\s+.*$', '', module_code, flags=re.MULTILINE)
            module_code = re.sub(r'^export\s+', '', module_code, flags=re.MULTILINE)
            module_code = re.sub(r'export\s*\{[^}]*\}', '', module_code)
            
            bundle += f'// Module: {module}\n'
            bundle += module_code + '\n\n'
    
    # Add main initialization
    main_path = 'content-scripts/main.js'
    if os.path.exists(main_path):
        with open(main_path, 'r', encoding='utf-8') as f:
            main_code = f.read()
        
        # Remove imports
        main_code = re.sub(r'^import\s+.*$', '', main_code, flags=re.MULTILINE)
        
        # Find initialization code
        init_start = main_code.find('// Initialize video detector')
        if init_start > -1:
            main_code = main_code[init_start:]
        
        bundle += '// Initialize\n'
        bundle += main_code
    
    bundle += '\n})();'
    
    return bundle

def optimize_code(code):
    """Apply all optimizations"""
    code = remove_comments(code)
    code = remove_console_logs(code)
    code = remove_empty_lines(code)
    code = compress_whitespace(code)
    return code

def main():
    """Main optimization process"""
    print("🚀 NotNot Bundle Optimizer")
    print("=" * 40)
    
    # Create output directory
    output_dir = 'dist-optimized'
    os.makedirs(output_dir, exist_ok=True)
    
    # Get original size
    original_path = 'content-scripts/notnot-content.js'
    if os.path.exists(original_path):
        original_size = os.path.getsize(original_path)
        with open(original_path, 'r', encoding='utf-8') as f:
            original_lines = len(f.readlines())
    else:
        print(f"Warning: {original_path} not found")
        original_size = 0
        original_lines = 0
    
    print(f"\nOriginal file:")
    print(f"  Size: {original_size / 1024:.2f} KB")
    print(f"  Lines: {original_lines}")
    
    # Create bundle
    print("\nCreating optimized bundle...")
    bundle = create_bundle()
    
    # Write unoptimized bundle
    bundle_path = os.path.join(output_dir, 'notnot-content-bundle.js')
    with open(bundle_path, 'w', encoding='utf-8') as f:
        f.write(bundle)
    
    bundle_size = len(bundle.encode('utf-8'))
    bundle_lines = len(bundle.split('\n'))
    
    print(f"\nBundle created:")
    print(f"  Size: {bundle_size / 1024:.2f} KB")
    print(f"  Lines: {bundle_lines}")
    
    # Optimize bundle
    print("\nOptimizing...")
    optimized = optimize_code(bundle)
    
    # Write optimized bundle
    optimized_path = os.path.join(output_dir, 'notnot-content.min.js')
    with open(optimized_path, 'w', encoding='utf-8') as f:
        f.write(optimized)
    
    optimized_size = len(optimized.encode('utf-8'))
    optimized_lines = len(optimized.split('\n'))
    
    print(f"\nOptimized file:")
    print(f"  Size: {optimized_size / 1024:.2f} KB")
    print(f"  Lines: {optimized_lines}")
    
    # Calculate reduction
    if original_size > 0:
        reduction = (1 - optimized_size / original_size) * 100
        print(f"\n✅ Size reduction: {reduction:.1f}%")
    
    # Save build info
    build_info = {
        'timestamp': datetime.now().isoformat(),
        'original': {
            'file': original_path,
            'size_kb': round(original_size / 1024, 2),
            'lines': original_lines
        },
        'bundle': {
            'file': 'notnot-content-bundle.js',
            'size_kb': round(bundle_size / 1024, 2),
            'lines': bundle_lines
        },
        'optimized': {
            'file': 'notnot-content.min.js',
            'size_kb': round(optimized_size / 1024, 2),
            'lines': optimized_lines
        },
        'reduction_percent': round(reduction, 1) if original_size > 0 else 0
    }
    
    with open(os.path.join(output_dir, 'build-info.json'), 'w') as f:
        json.dump(build_info, f, indent=2)
    
    print(f"\nBuild info saved to: {output_dir}/build-info.json")
    print(f"\n✨ Optimization complete!")
    print(f"Use: {optimized_path}")

if __name__ == '__main__':
    main()