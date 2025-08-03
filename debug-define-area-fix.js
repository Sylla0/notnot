// Debug script to test Define Area functionality after fix
// Run this in the browser console on a YouTube video page

console.log('=== Define Area Debug Test (After Fix) ===');

// Test 1: Check if handleDefineArea method exists
console.log('\nTest 1: Method Existence Check');
if (window.videoDetector && window.videoDetector.overlayInjector) {
  const injector = window.videoDetector.overlayInjector;
  console.log('OverlayInjector exists:', true);
  console.log('handleDefineArea method exists?', typeof injector.handleDefineArea === 'function');
  console.log('handleCapture method exists?', typeof injector.handleCapture === 'function');
  console.log('video element exists?', !!injector.video);
  console.log('sidebar exists?', !!injector.sidebar);
} else {
  console.log('OverlayInjector not found!');
}

// Test 2: Test Define Area via message
console.log('\nTest 2: Testing Define Area via Message');
async function testDefineAreaMessage() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'define_capture_area' }, (response) => {
      console.log('Define Area message response:', response);
      resolve(response);
    });
  });
}

// Test 3: Direct method call
console.log('\nTest 3: Direct Method Call Test');
async function testDefineAreaDirect() {
  if (window.videoDetector && window.videoDetector.overlayInjector && window.videoDetector.overlayInjector.handleDefineArea) {
    try {
      console.log('Calling handleDefineArea directly...');
      await window.videoDetector.overlayInjector.handleDefineArea();
      console.log('handleDefineArea call completed');
    } catch (error) {
      console.error('handleDefineArea failed:', error);
    }
  } else {
    console.log('Cannot test - handleDefineArea method not available');
  }
}

// Test 4: Check keyboard shortcut settings
console.log('\nTest 4: Keyboard Shortcut Settings');
chrome.storage.sync.get('notnot_settings', (result) => {
  const settings = result.notnot_settings || {};
  console.log('Current settings:', settings);
  console.log('Define Area shortcut:', settings.defineAreaShortcut || 'Alt+Shift+A (default)');
  console.log('Capture shortcut:', settings.captureShortcut || 'Alt+S (default)');
});

// Test 5: Create test button for manual testing
console.log('\nTest 5: Creating Manual Test Buttons');

// Remove any existing test buttons
document.querySelectorAll('.notnot-test-btn').forEach(btn => btn.remove());

// Create container
const container = document.createElement('div');
container.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

// Define Area button
const defineBtn = document.createElement('button');
defineBtn.className = 'notnot-test-btn';
defineBtn.textContent = 'Test Define Area';
defineBtn.style.cssText = `
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;
defineBtn.addEventListener('click', async () => {
  console.log('\\n=== Manual Define Area Test ===');
  await testDefineAreaDirect();
});

// Message test button
const msgBtn = document.createElement('button');
msgBtn.className = 'notnot-test-btn';
msgBtn.textContent = 'Test via Message';
msgBtn.style.cssText = `
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;
msgBtn.addEventListener('click', async () => {
  console.log('\\n=== Message Define Area Test ===');
  await testDefineAreaMessage();
});

// Simulate keyboard shortcut button
const kbBtn = document.createElement('button');
kbBtn.className = 'notnot-test-btn';
kbBtn.textContent = 'Simulate Alt+Shift+A';
kbBtn.style.cssText = `
  padding: 10px 20px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;
kbBtn.addEventListener('click', () => {
  console.log('\\n=== Simulating Alt+Shift+A ===');
  const event = new KeyboardEvent('keydown', {
    key: 'A',
    code: 'KeyA',
    altKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);
  console.log('Keyboard event dispatched');
});

container.appendChild(defineBtn);
container.appendChild(msgBtn);
container.appendChild(kbBtn);
document.body.appendChild(container);

console.log('\\nTest buttons created. Click them to test Define Area functionality.');
console.log('Watch the console for debug output.');
console.log('If successful, you should see the area selector overlay appear.');