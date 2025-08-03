# Define Area Fix - Complete Solution

## Problem Summary
The Define Area functionality was completely non-functional - neither the popup button nor the keyboard shortcut (Alt+Shift+A) worked.

## Root Cause
The `OverlayInjector` class was not being initialized properly. In `VideoDetector.initializeOverlay()`, the code was calling:
```javascript
await this.overlayInjector.inject(); // WRONG - this method doesn't exist
```

But the `OverlayInjector` class has an `init()` method, not `inject()`. This meant:
1. The `init()` method was never called
2. The `captureHandler` was never created (it's created in `init()`)
3. When Define Area was triggered, `captureHandler` was null
4. The entire Define Area flow failed silently

## The Fix
Changed line 1744 in `/home/mulkib/notnot/content-scripts/notnot-content.js`:
```javascript
// Before:
await this.overlayInjector.inject();

// After:
await this.overlayInjector.init();
```

## What This Fix Does
1. Properly initializes the `OverlayInjector` when a video is detected
2. Creates the `StorageManager` instance
3. Creates the `CaptureHandler` instance with the video element
4. Sets up keyboard shortcuts properly
5. Makes Define Area functionality work as expected

## Testing
After this fix:
1. The Define Area button in the popup will work
2. The keyboard shortcut (Alt+Shift+A) will work
3. The area selector overlay will appear when triggered
4. Users can drag to select a capture area
5. The selected area will be saved and used for subsequent captures

## Debug Logging Added
Enhanced debug logging throughout the flow:
- `OverlayInjector.handleDefineArea()` - logs when triggered and checks initialization
- `CaptureHandler.defineArea()` - logs video element and dimensions
- `AreaSelector.start()` - logs overlay creation and DOM insertion

## Files Modified
1. `/home/mulkib/notnot/content-scripts/notnot-content.js` - Fixed the initialization call
2. `/home/mulkib/notnot/content-scripts/modules/overlay-injector.js` - Added debug logging
3. `/home/mulkib/notnot/content-scripts/modules/capture-handler.js` - Added debug logging
4. `/home/mulkib/notnot/content-scripts/modules/area-selector.js` - Added debug logging

## Verification Steps
1. Install the updated extension
2. Navigate to a YouTube video
3. Wait for the video to load
4. Either:
   - Click the NotNot extension icon and click "Define Area"
   - Press Alt+Shift+A (or your custom shortcut)
5. The dark overlay should appear with crosshair cursor
6. Drag to select an area
7. The area will be saved for future captures

The Define Area functionality is now fully operational!