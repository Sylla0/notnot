// NotNot Content Script v2 - Modularized version
(async function() {
  // Prevent duplicate injection
  if (window.notnotContentScriptLoaded) {
    console.log('NotNot: Content script already loaded, skipping...');
    return;
  }
  window.notnotContentScriptLoaded = true;
  console.log('NotNot: Content script v2 loaded');

  // Import modules
  const { VideoDetector } = await import('./modules/video-detector.js');
  const { CONSTANTS, EVENTS } = await import('./modules/constants.js');
  
  // Initialize video detector
  const videoDetector = new VideoDetector();
  
  // Message handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('NotNot: Received message', request.type);
    
    switch (request.type) {
      case CONSTANTS.MESSAGES.CHECK_VIDEO:
        const hasVideo = !!videoDetector.video;
        sendResponse({
          hasVideo: hasVideo,
          title: hasVideo ? document.title : null
        });
        break;
        
      case CONSTANTS.MESSAGES.TOGGLE_SIDEBAR:
        if (videoDetector.overlayInjector) {
          videoDetector.overlayInjector.toggleSidebar();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No video detected' });
        }
        break;
        
      case CONSTANTS.MESSAGES.CAPTURE_SCREENSHOT:
        if (videoDetector.overlayInjector) {
          videoDetector.overlayInjector.handleCapture();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No video detected' });
        }
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true; // Keep message channel open
  });
  
  // Start detection
  videoDetector.start();
  
  // Cleanup on unload
  window.addEventListener('unload', () => {
    videoDetector.cleanup();
  });
  
  // Make detector available globally for debugging
  window.notnotVideoDetector = videoDetector;
  
})();