// Debug script for keyboard shortcut issue
// Run this in the browser console on a YouTube video page

console.log('=== Keyboard Shortcut Debug Test ===');

// Test 1: Check current shortcut settings
console.log('\nTest 1: Current Settings');
chrome.storage.sync.get('notnot_settings', (result) => {
  const settings = result.notnot_settings || {};
  console.log('Settings:', settings);
  console.log('Define Area shortcut:', settings.defineAreaShortcut || 'Alt+Shift+A (default)');
  console.log('Capture shortcut:', settings.captureShortcut || 'Alt+S (default)');
});

// Test 2: Test the checkShortcut function
console.log('\nTest 2: Testing checkShortcut Function');
function checkShortcut(event, shortcut) {
  if (!shortcut) return false;
  
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd')
  };
  
  const eventKey = event.key.toLowerCase();
  
  console.log('Shortcut parts:', parts);
  console.log('Expected key:', key);
  console.log('Event key:', eventKey);
  console.log('Expected modifiers:', modifiers);
  console.log('Event modifiers:', {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey
  });
  
  return (
    event.ctrlKey === modifiers.ctrl &&
    event.altKey === modifiers.alt &&
    event.shiftKey === modifiers.shift &&
    event.metaKey === modifiers.meta &&
    eventKey === key
  );
}

// Test 3: Simulate Alt+Shift+A
console.log('\nTest 3: Simulating Alt+Shift+A');
const testEvent = new KeyboardEvent('keydown', {
  key: 'A',
  code: 'KeyA',
  altKey: true,
  shiftKey: true,
  ctrlKey: false,
  metaKey: false,
  bubbles: true,
  cancelable: true
});

console.log('Test event properties:', {
  key: testEvent.key,
  altKey: testEvent.altKey,
  shiftKey: testEvent.shiftKey,
  ctrlKey: testEvent.ctrlKey,
  metaKey: testEvent.metaKey
});

const result = checkShortcut(testEvent, 'Alt+Shift+A');
console.log('checkShortcut result for Alt+Shift+A:', result);

// Test 4: Create keyboard listener
console.log('\nTest 4: Setting up test keyboard listener');
const testHandler = (e) => {
  if (e.altKey || e.shiftKey) {
    console.log('Test handler - Key event:', {
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey
    });
    
    // Test with the checkShortcut function
    const isDefineArea = checkShortcut(e, 'Alt+Shift+A');
    console.log('Is Define Area shortcut?', isDefineArea);
    
    if (isDefineArea) {
      console.log('✅ Define Area shortcut detected!');
      e.preventDefault();
      e.stopPropagation();
    }
  }
};

// Remove any existing test handler
if (window.notnotTestHandler) {
  document.removeEventListener('keydown', window.notnotTestHandler, true);
}

// Add new test handler
window.notnotTestHandler = testHandler;
document.addEventListener('keydown', testHandler, true);

console.log('\n✅ Test keyboard listener installed');
console.log('Try pressing Alt+Shift+A and watch the console');
console.log('The handler should detect and log the shortcut');

// Test 5: Check if main handler exists
console.log('\nTest 5: Main Handler Check');
console.log('videoDetector exists?', !!window.videoDetector);
console.log('overlayInjector exists?', !!window.videoDetector?.overlayInjector);
console.log('handleDefineArea exists?', typeof window.videoDetector?.overlayInjector?.handleDefineArea === 'function');

// Create button to manually trigger Define Area
const btn = document.createElement('button');
btn.textContent = 'Manually Trigger Define Area';
btn.style.cssText = `
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 2147483647;
  padding: 10px 20px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;
btn.addEventListener('click', () => {
  console.log('Manual trigger clicked');
  if (window.videoDetector?.overlayInjector?.handleDefineArea) {
    window.videoDetector.overlayInjector.handleDefineArea();
  } else {
    console.error('handleDefineArea not available');
  }
});
document.body.appendChild(btn);

console.log('\n📌 Manual trigger button added to page');