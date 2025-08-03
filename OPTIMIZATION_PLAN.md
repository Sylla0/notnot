# NotNot Chrome Extension - Code Optimization Plan

## Current Issues

1. **Code Duplication**: Classes are defined both inline and as modules
2. **Large Bundle Size**: Main content script is 2164 lines 
3. **Performance Issues**:
   - Multiple event listeners for same events
   - Redundant DOM queries
   - No caching for frequently accessed data
4. **Memory Leaks**: Event listeners not properly cleaned up

## Optimization Strategy

### 1. Remove Duplicate Code
- Use modular imports instead of embedded classes
- Consolidate utility functions
- Remove debug logging in production

### 2. Performance Optimizations

#### Event Handler Optimization
```javascript
// Before: Multiple listeners
document.addEventListener('keydown', handler1);
document.addEventListener('keydown', handler2);

// After: Single consolidated handler
document.addEventListener('keydown', consolidatedHandler, true);
```

#### DOM Query Caching
```javascript
// Before: Query every time
const title = document.querySelector('h1.ytd-watch-metadata');

// After: Cache and reuse
const titleCache = new Map();
function getTitle() {
  if (!titleCache.has('title')) {
    titleCache.set('title', document.querySelector('h1.ytd-watch-metadata'));
  }
  return titleCache.get('title');
}
```

#### Settings Caching
```javascript
// Cache settings for 5 seconds to reduce storage API calls
let settingsCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5000;
```

### 3. Bundle Size Reduction

- Remove embedded classes (save ~1000 lines)
- Minify constants and remove comments
- Use dynamic imports for rarely used features

### 4. Memory Management

- Implement proper cleanup in destroy() methods
- Use WeakMap for DOM element references
- Remove event listeners when not needed

### 5. Specific Optimizations

#### Debounce Expensive Operations
```javascript
// Debounce note saving
const saveNote = utils.debounce(() => {
  this.storage.saveNote(this.currentNote);
}, 1000);
```

#### Lazy Loading
```javascript
// Load sidebar only when needed
async toggleSidebar() {
  if (!this.sidebarLoaded) {
    const { SidebarUI } = await import('./sidebar-ui.js');
    this.sidebar = new SidebarUI(this.storage);
    this.sidebarLoaded = true;
  }
  this.sidebar.toggle();
}
```

#### Optimize Canvas Operations
```javascript
// Reuse canvas instead of creating new ones
let captureCanvas = null;
function getCanvas() {
  if (!captureCanvas) {
    captureCanvas = document.createElement('canvas');
  }
  return captureCanvas;
}
```

## Implementation Priority

1. **High Priority**:
   - Remove duplicate code
   - Consolidate event handlers
   - Add settings caching

2. **Medium Priority**:
   - Implement lazy loading
   - Add DOM query caching
   - Optimize canvas operations

3. **Low Priority**:
   - Minification
   - Remove debug logs
   - Advanced memory management

## Expected Results

- **Bundle Size**: Reduce by ~50% (from 2164 to ~1000 lines)
- **Memory Usage**: Reduce by ~30% through proper cleanup
- **Performance**: Improve by ~40% through caching and optimization
- **Load Time**: Reduce initial load by using dynamic imports