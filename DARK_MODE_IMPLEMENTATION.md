# NotNot Dark Mode Implementation

## Overview
Dark mode has been implemented across all NotNot UI components with automatic system preference detection and manual toggle support.

## Key Features

1. **Three Theme Modes**:
   - Light: Default light theme
   - Dark: Manual dark theme
   - Auto: Follows system preference

2. **Comprehensive Coverage**:
   - Popup window
   - Sidebar
   - Options page
   - Dashboard
   - Content overlay controls

3. **Smart Color Management**:
   - CSS variables for consistent theming
   - Automatic color contrast adjustments
   - Hardcoded color overrides for legacy styles

## Technical Implementation

### CSS Variables
All colors are defined as CSS variables in `assets/styles/dark-mode.css`:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #111827;
  /* ... other light mode colors */
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --text-primary: #f1f5f9;
  /* ... other dark mode colors */
}
```

### Dark Mode Manager
The `DarkModeManager` class in `assets/js/dark-mode.js` handles:
- Theme persistence in Chrome storage
- System preference detection
- Theme toggling
- DOM updates

### Color Overrides
To ensure visibility of hardcoded colors, the dark mode CSS includes comprehensive overrides:

```css
/* Override hardcoded colors */
[data-theme="dark"] body {
  color: var(--text-primary) !important;
}

/* Specific color overrides for various gray shades */
[data-theme="dark"] h1, h2, h3, h4, h5, h6 {
  color: var(--text-primary) !important;
}
```

## Usage

### Toggle Dark Mode
Click the theme toggle button in:
- Popup header (right side)
- Options page
- Dashboard

### Theme Persistence
The selected theme is saved to Chrome storage and persists across sessions.

### System Preference
When set to "Auto", the theme follows the system's dark mode preference.

## Testing

Test dark mode using the included test file:
1. Open `test-dark-mode.html` in a browser
2. Click the theme toggle to cycle through modes
3. Verify all text is visible in both light and dark modes

## Troubleshooting

If text is not visible in dark mode:
1. Check if the element has a hardcoded color
2. Add appropriate CSS variable or override in dark-mode.css
3. Use `!important` if necessary to override inline styles

## Color Palette

### Light Mode
- Background: #ffffff, #f9fafb, #f3f4f6
- Text: #111827, #374151, #6b7280, #9ca3af
- Accent: #3b82f6
- Borders: #e5e7eb, #d1d5db

### Dark Mode
- Background: #0f172a, #1e293b, #334155
- Text: #f1f5f9, #e2e8f0, #cbd5e1, #94a3b8
- Accent: #3b82f6
- Borders: #334155, #475569