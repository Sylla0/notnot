// Debug script for Database not initialized error
// Run this in the browser console on a YouTube video page

console.log('=== Capture Error Debug Test ===');

// Test 1: Check overlay injector initialization
console.log('\nTest 1: Overlay Injector Status');
if (window.videoDetector && window.videoDetector.overlayInjector) {
  const injector = window.videoDetector.overlayInjector;
  console.log('OverlayInjector exists:', true);
  console.log('storage exists?', !!injector.storage);
  console.log('storage.db exists?', !!injector.storage?.db);
  console.log('captureHandler exists?', !!injector.captureHandler);
  console.log('sidebar exists?', !!injector.sidebar);
  console.log('sidebarLoaded?', injector.sidebarLoaded);
} else {
  console.log('OverlayInjector not found!');
}

// Test 2: Try to capture directly
console.log('\nTest 2: Direct Capture Test');
async function testCapture() {
  if (window.videoDetector && window.videoDetector.overlayInjector) {
    try {
      console.log('Attempting capture...');
      await window.videoDetector.overlayInjector.handleCapture();
      console.log('Capture completed successfully');
    } catch (error) {
      console.error('Capture failed:', error);
      console.error('Error stack:', error.stack);
    }
  } else {
    console.log('Cannot test - overlay injector not available');
  }
}

// Test 3: Check StorageManager directly
console.log('\nTest 3: Storage Manager Status');
if (window.videoDetector && window.videoDetector.overlayInjector && window.videoDetector.overlayInjector.storage) {
  const storage = window.videoDetector.overlayInjector.storage;
  console.log('StorageManager class:', storage.constructor.name);
  console.log('db property:', storage.db);
  console.log('dbName:', storage.dbName);
  console.log('dbVersion:', storage.dbVersion);
  
  // Try to manually init if needed
  if (!storage.db) {
    console.log('\nAttempting manual storage initialization...');
    try {
      await storage.init();
      console.log('Manual init successful, db now exists?', !!storage.db);
    } catch (error) {
      console.error('Manual init failed:', error);
    }
  }
}

// Test 4: Check sidebar initialization
console.log('\nTest 4: Sidebar Status');
async function checkSidebar() {
  if (window.videoDetector && window.videoDetector.overlayInjector) {
    const injector = window.videoDetector.overlayInjector;
    
    if (!injector.sidebar) {
      console.log('Sidebar not loaded, triggering toggle to load it...');
      await injector.toggleSidebar();
      console.log('After toggle - sidebar exists?', !!injector.sidebar);
      console.log('After toggle - sidebar storage exists?', !!injector.sidebar?.storage);
      console.log('After toggle - sidebar storage.db exists?', !!injector.sidebar?.storage?.db);
    } else {
      console.log('Sidebar already loaded');
      console.log('sidebar storage:', injector.sidebar.storage);
      console.log('sidebar storage.db:', injector.sidebar.storage?.db);
    }
  }
}

// Test 5: Create test button for manual testing
console.log('\nTest 5: Creating Manual Test Button');
const testBtn = document.createElement('button');
testBtn.textContent = 'Test Capture (Check Console)';
testBtn.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;

testBtn.addEventListener('click', async () => {
  console.log('\n=== Manual Capture Test Started ===');
  await testCapture();
  await checkSidebar();
  console.log('=== Manual Capture Test Complete ===');
});

document.body.appendChild(testBtn);

console.log('\n=== Initial Tests ===');
// Run initial tests
(async () => {
  await checkSidebar();
  console.log('\nClick the green test button to test capture functionality');
  console.log('Watch the console for detailed debug information');
})();