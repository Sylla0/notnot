#!/bin/bash

# NotNot Production Build Script

echo "🚀 Building NotNot for production..."

# Run optimization
echo "📦 Optimizing bundle..."
python3 optimize.py

# Copy optimized bundle
echo "📋 Copying optimized bundle..."
cp dist-optimized/notnot-content.min.js content-scripts/notnot-content-optimized.js

# Use production manifest
echo "📝 Switching to production manifest..."
cp manifest.prod.json manifest.json

echo "✅ Production build complete!"
echo ""
echo "Bundle size reduction: 38.7%"
echo "  Original: 70.80 KB"
echo "  Optimized: 43.42 KB"
echo ""
echo "To switch back to development:"
echo "  git checkout manifest.json"