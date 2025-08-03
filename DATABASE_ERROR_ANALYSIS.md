# Database Not Initialized Error - Analysis & Solution

## Problem Description
Error: "Failed to capture screenshot: Database not initialized"

## Root Cause Analysis

### Issue Flow
1. User triggers capture (via popup or keyboard shortcut)
2. `OverlayInjector.handleCapture()` is called
3. Capture is successful and returns data
4. `OverlayInjector` checks if sidebar is loaded/visible
5. If not loaded, it calls `toggleSidebar()` which:
   - Imports `SidebarUI` module
   - Creates new `SidebarUI(this.storage)`
   - Calls `await this.sidebar.init()`
6. Then calls `this.sidebar.addCapture(captureData)`
7. `SidebarUI.addCapture()` calls `this.storage.saveCapture()`
8. `StorageManager.saveCapture()` throws "Database not initialized"

### Key Finding
The issue is that `OverlayInjector` passes its `storage` instance to `SidebarUI`, but the sidebar might be created before the storage is fully initialized, or there's a timing issue.

## Debug Points Added

### 1. OverlayInjector.init()
```javascript
console.log('OverlayInjector: storage exists?', !!this.storage);
console.log('OverlayInjector: storage.db exists?', !!this.storage.db);
```

### 2. SidebarUI.addCapture()
```javascript
console.log('SidebarUI: storage exists?', !!this.storage);
console.log('SidebarUI: storage.db exists?', !!this.storage?.db);
```

### 3. StorageManager methods
Added null checks with descriptive error messages to all database operations.

## Testing Steps

1. Open a YouTube video
2. Open browser console (F12)
3. Paste and run the debug script from `debug-capture-error.js`
4. Click the green "Test Capture" button
5. Check console output for:
   - Storage initialization status
   - Database connection status
   - Error messages and stack traces

## Potential Solutions

### Solution 1: Ensure Storage is Initialized
Make sure `OverlayInjector.init()` completes before any capture operations.

### Solution 2: Lazy Initialization
Add initialization check in `StorageManager.saveCapture()`:
```javascript
async saveCapture(capture) {
  if (!this.db) {
    await this.init();
  }
  // ... rest of the method
}
```

### Solution 3: Check Sidebar Storage Reference
Ensure the storage reference passed to SidebarUI is the same initialized instance.

## Next Steps
1. Run the debug script to gather specific error information
2. Check if storage initialization is completing successfully
3. Verify the storage instance is properly shared between components
4. Implement the appropriate solution based on findings