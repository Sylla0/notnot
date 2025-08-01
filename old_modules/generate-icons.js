// Simple icon generator for NotNot
// This creates basic SVG icons for the extension

const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

const svgIcon = `
<svg width="SIZE" height="SIZE" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="128" height="128" rx="24" fill="#3B82F6"/>
  
  <!-- Note icon -->
  <path d="M40 32h32a8 8 0 018 8v56a8 8 0 01-8 8H40a8 8 0 01-8-8V40a8 8 0 018-8z" fill="white" opacity="0.9"/>
  <path d="M72 32v16a8 8 0 008 8h16" fill="white" opacity="0.7"/>
  
  <!-- Lines -->
  <rect x="44" y="64" width="24" height="3" rx="1.5" fill="#3B82F6"/>
  <rect x="44" y="74" width="24" height="3" rx="1.5" fill="#3B82F6"/>
  <rect x="44" y="84" width="16" height="3" rx="1.5" fill="#3B82F6"/>
  
  <!-- Play button overlay -->
  <circle cx="88" cy="88" r="20" fill="#10B981"/>
  <path d="M83 80l12 8-12 8V80z" fill="white"/>
</svg>
`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname);
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate PNG placeholders (in real app, you'd use a proper converter)
sizes.forEach(size => {
  const svg = svgIcon.replace(/SIZE/g, size);
  
  // For now, we'll create placeholder text files
  // In production, you'd convert SVG to PNG
  fs.writeFileSync(
    path.join(iconsDir, `icon${size}.png`),
    `Placeholder for ${size}x${size} icon. Convert the SVG to PNG.`
  );
});

console.log('Icon placeholders created. Convert SVG to PNG for actual icons.');