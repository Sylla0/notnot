# Capture Screenshot Error Fix

## Problem
Error: "Failed to capture screenshot: Cannot read properties of null (reading 'transaction')"

## Root Cause
The embedded `StorageManager` class in `notnot-content.js` was trying to access `this.db.transaction()` without checking if `this.db` was null. This differs from the modular `StorageManager` in `/content-scripts/modules/storage-manager.js` which has proper null checks.

## Solution Applied
Added null checks to all database methods in the embedded StorageManager class:

```javascript
if (!this.db) {
  console.error('StorageManager: Database not initialized for [method name]');
  throw new Error('Database not initialized');
}
```

## Methods Updated
1. `saveNote()` - Added null check before creating transaction
2. `getNoteByVideoUrl()` - Added null check before creating transaction
3. `saveCapture()` - Added null check before creating transaction
4. `getCapturesByNoteId()` - Added null check before creating transaction
5. `getAllNotes()` - Added null check before creating transaction

## Additional Improvements
Enhanced error handling in the Sidebar's `init()` method to catch and log storage initialization failures:

```javascript
try {
  await this.storage.init();
  console.log('NotNot: Storage initialized, db:', !!this.storage.db);
} catch (error) {
  console.error('NotNot: Failed to initialize storage:', error);
  throw error;
}
```

## Expected Behavior
Now when capturing:
1. If the database is properly initialized, captures will work as expected
2. If the database is not initialized, a clear error message will be logged: "Database not initialized"
3. The error will be caught and displayed to the user instead of causing a silent failure

## Testing
1. Navigate to a YouTube video
2. Click the capture button or use the capture shortcut
3. The capture should work without errors
4. If there's an initialization issue, check the console for clear error messages

## Prevention
To prevent this in the future:
1. Always add null checks before accessing object properties
2. Keep embedded code in sync with modular code
3. Use consistent error handling patterns across the codebase