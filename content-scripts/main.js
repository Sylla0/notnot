// NotNot Content Script - Main Entry Point
import { CONSTANTS } from './modules/constants.js';
import { utils } from './modules/utils.js';
import { StorageManager } from './modules/storage-manager.js';
import { AreaSelector } from './modules/area-selector.js';
import { CaptureHandler } from './modules/capture-handler.js';
import { SidebarUI } from './modules/sidebar-ui.js';
import { OverlayInjector } from './modules/overlay-injector.js';
import { VideoDetector } from './modules/video-detector.js';

// Prevent multiple injections
if (window.notnotContentScriptLoaded) {
  console.log('NotNot: Content script already loaded, skipping...');
} else {
  window.notnotContentScriptLoaded = true;
  console.log('NotNot: Content script loaded');

  // Initialize video detector
  const videoDetector = new VideoDetector();
  window.videoDetector = videoDetector;
  videoDetector.init();

  // Settings cache for performance
  let settingsCache = null;
  let settingsCacheTime = 0;
  const SETTINGS_CACHE_DURATION = 5000; // 5 seconds

  async function getSettingsWithCache() {
    const now = Date.now();
    if (settingsCache && now - settingsCacheTime < SETTINGS_CACHE_DURATION) {
      return settingsCache;
    }
    
    return new Promise((resolve) => {
      chrome.storage.sync.get('notnot_settings', (result) => {
        settingsCache = result.notnot_settings || {};
        settingsCacheTime = now;
        resolve(settingsCache);
      });
    });
  }

  // Optimized shortcut checker
  function checkShortcut(event, shortcut) {
    if (!shortcut) return false;
    
    const parts = shortcut.toLowerCase().split('+');
    const expectedKey = parts[parts.length - 1];
    const eventKey = event.key.toLowerCase();
    
    // Quick key check first (most likely to fail)
    if (eventKey !== expectedKey) return false;
    
    // Then check modifiers
    return (
      event.ctrlKey === parts.includes('ctrl') &&
      event.altKey === parts.includes('alt') &&
      event.shiftKey === parts.includes('shift') &&
      event.metaKey === (parts.includes('meta') || parts.includes('cmd'))
    );
  }

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('NotNot: Message received', request);
    
    if (!videoDetector.overlayInjector) {
      console.error('NotNot: Overlay injector not ready');
      sendResponse({ success: false, error: 'Overlay injector not initialized' });
      return true;
    }

    const handlers = {
      [CONSTANTS.MESSAGES.CAPTURE_SCREENSHOT]: () => {
        console.log('NotNot: Handling capture screenshot message');
        videoDetector.overlayInjector.handleCapture();
        return { success: true };
      },
      [CONSTANTS.MESSAGES.DEFINE_CAPTURE_AREA]: () => {
        console.log('NotNot: Handling define capture area message');
        videoDetector.overlayInjector.handleDefineArea();
        return { success: true };
      },
      [CONSTANTS.MESSAGES.TOGGLE_SIDEBAR]: () => {
        console.log('NotNot: Handling toggle sidebar message');
        videoDetector.overlayInjector.toggleSidebar();
        return { success: true };
      },
      'CHECK_VIDEO': () => {
        const hasVideo = !!videoDetector.video;
        console.log('NotNot: Checking video status', hasVideo);
        return {
          hasVideo: hasVideo,
          title: hasVideo ? utils.getVideoTitle() : null
        };
      }
    };

    const handler = handlers[request.type];
    if (handler) {
      try {
        const result = handler();
        sendResponse(result);
      } catch (error) {
        console.error('NotNot: Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
    } else {
      console.warn('NotNot: Unknown message type', request.type);
      sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep message channel open for async response
  });

  // Global keyboard shortcut handler
  document.addEventListener('keydown', async (e) => {
    // Skip if no modifiers
    if (!e.altKey && !e.ctrlKey) return;
    
    // Skip if typing in input field (for capture shortcut)
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // Get current settings with caching
    const settings = await getSettingsWithCache();
    
    const defineAreaShortcut = settings.defineAreaShortcut || 'Alt+Shift+A';
    const isDefineAreaShortcut = checkShortcut(e, defineAreaShortcut);
    
    if (isDefineAreaShortcut) {
      console.log('NotNot Global: Define Area shortcut detected, triggering define area');
      e.preventDefault();
      e.stopPropagation();
      
      if (window.videoDetector?.overlayInjector) {
        window.videoDetector.overlayInjector.handleDefineArea();
      } else {
        console.error('NotNot Global: Overlay injector not available');
      }
      return;
    }
    
    // Handle capture shortcut
    const captureShortcut = settings.captureShortcut || 'Alt+S';
    const isCaptureShortcut = checkShortcut(e, captureShortcut);
    
    if (isCaptureShortcut && !isTyping) {
      console.log('NotNot Global: Capture shortcut detected');
      e.preventDefault();
      e.stopPropagation();
      
      if (window.videoDetector?.overlayInjector) {
        window.videoDetector.overlayInjector.handleCapture();
      }
    }
  }, true); // Use capture phase
}

// Export for debugging
window.NotNotDebug = {
  CONSTANTS,
  utils,
  getVideoDetector: () => window.videoDetector,
  getOverlayInjector: () => window.videoDetector?.overlayInjector,
  getSidebar: () => window.videoDetector?.overlayInjector?.sidebar,
  triggerDefineArea: () => {
    if (window.videoDetector?.overlayInjector) {
      window.videoDetector.overlayInjector.handleDefineArea();
    } else {
      console.error('Overlay injector not available');
    }
  },
  triggerCapture: () => {
    if (window.videoDetector?.overlayInjector) {
      window.videoDetector.overlayInjector.handleCapture();
    } else {
      console.error('Overlay injector not available');
    }
  }
};