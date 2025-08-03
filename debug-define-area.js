// Debug script for testing Define Area functionality
// Paste this into the browser console on a YouTube video page

console.log('=== Define Area Debug Test ===');

// Test 1: Check if video detector exists
console.log('Test 1: Video Detector');
console.log('window.videoDetector exists?', !!window.videoDetector);
if (window.videoDetector) {
  console.log('overlayInjector exists?', !!window.videoDetector.overlayInjector);
  if (window.videoDetector.overlayInjector) {
    console.log('captureHandler exists?', !!window.videoDetector.overlayInjector.captureHandler);
  }
}

// Test 2: Try to trigger Define Area directly
console.log('\nTest 2: Direct Define Area Trigger');
if (window.videoDetector && window.videoDetector.overlayInjector) {
  console.log('Calling handleDefineArea()...');
  window.videoDetector.overlayInjector.handleDefineArea();
} else {
  console.log('Cannot trigger - video detector or overlay injector not ready');
}

// Test 3: Send message through Chrome runtime
console.log('\nTest 3: Message-based Trigger');
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('Sending DEFINE_CAPTURE_AREA message...');
  chrome.runtime.sendMessage({ type: 'define_capture_area' }, (response) => {
    console.log('Message response:', response);
  });
}

// Test 4: Check for video element
console.log('\nTest 4: Video Element Check');
const videos = document.querySelectorAll('video');
console.log('Number of video elements found:', videos.length);
videos.forEach((video, index) => {
  console.log(`Video ${index}:`, {
    src: video.src,
    width: video.videoWidth,
    height: video.videoHeight,
    readyState: video.readyState,
    paused: video.paused
  });
});

// Test 5: Create a test button
console.log('\nTest 5: Creating Test Button');
const testButton = document.createElement('button');
testButton.textContent = 'Test Define Area';
testButton.style.cssText = `
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 2147483647;
  padding: 10px 20px;
  background: #ff0000;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
`;

testButton.addEventListener('click', () => {
  console.log('Test button clicked - triggering Define Area');
  if (window.videoDetector && window.videoDetector.overlayInjector) {
    window.videoDetector.overlayInjector.handleDefineArea();
  } else {
    console.error('Video detector not available');
    
    // Try to initialize if not ready
    const video = document.querySelector('video');
    if (video) {
      console.log('Found video, trying to initialize...');
      // This would require access to VideoDetector class
      console.log('Cannot initialize from console - VideoDetector class not accessible');
    }
  }
});

document.body.appendChild(testButton);
console.log('Test button added to page');

// Test 6: Check for any existing overlays
console.log('\nTest 6: Existing Overlays Check');
const existingOverlays = document.querySelectorAll('.notnot-capture-area');
console.log('Existing capture area overlays:', existingOverlays.length);
existingOverlays.forEach((overlay, index) => {
  console.log(`Overlay ${index}:`, {
    display: overlay.style.display,
    visibility: overlay.style.visibility,
    zIndex: overlay.style.zIndex,
    position: overlay.style.position
  });
});

console.log('\n=== Debug Test Complete ===');
console.log('Check the console output above and try clicking the red test button');