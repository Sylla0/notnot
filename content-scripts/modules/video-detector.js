// NotNot Video Detector - YouTube video detection and initialization
import { CONSTANTS } from './constants.js';
import { utils } from './utils.js';

export class VideoDetector {
  constructor() {
    this.video = null;
    this.overlayInjector = null;
    this.observer = null;
    this.initialized = false;
  }

  start() {
    console.log('VideoDetector: Starting detection...');
    
    // Initial check
    this.checkForVideo();
    
    // Set up observer for dynamic content
    this.setupObserver();
    
    // Listen for YouTube navigation
    this.setupNavigationListener();
  }

  checkForVideo() {
    // YouTube video selector
    const video = document.querySelector('video.html5-main-video, video');
    
    if (video && video.src && !this.initialized) {
      console.log('VideoDetector: Video found');
      this.video = video;
      this.initialized = true;
      this.initializeOverlay();
      
      // Save current video info
      this.saveVideoInfo();
      
      // Listen for video changes
      video.addEventListener('loadedmetadata', () => {
        this.saveVideoInfo();
      });
    }
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.initialized) {
        this.checkForVideo();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupNavigationListener() {
    // YouTube uses history API for navigation
    let lastUrl = location.href;
    
    const checkUrlChange = () => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log('VideoDetector: URL changed, reinitializing...');
        this.handleNavigation();
      }
    };

    // Check periodically for URL changes
    setInterval(checkUrlChange, 1000);
  }

  handleNavigation() {
    // Reset state
    this.initialized = false;
    this.video = null;
    
    // Clean up existing overlay
    if (this.overlayInjector) {
      this.overlayInjector.cleanup();
      this.overlayInjector = null;
    }
    
    // Re-check for video after a delay
    setTimeout(() => {
      this.checkForVideo();
    }, 1000);
  }

  async initializeOverlay() {
    try {
      // Dynamically import OverlayInjector
      const { OverlayInjector } = await import('./overlay-injector.js');
      this.overlayInjector = new OverlayInjector(this.video);
      await this.overlayInjector.init();
    } catch (error) {
      console.error('VideoDetector: Failed to initialize overlay', error);
    }
  }

  saveVideoInfo() {
    const videoInfo = {
      title: utils.getVideoTitle(),
      url: window.location.href,
      platform: CONSTANTS.VIDEO_PLATFORMS.YOUTUBE,
      duration: this.video.duration,
      timestamp: new Date().toISOString()
    };

    chrome.storage.local.set({
      [CONSTANTS.STORAGE_KEYS.CURRENT_VIDEO]: videoInfo
    });

    // Notify popup/background
    chrome.runtime.sendMessage({
      type: CONSTANTS.MESSAGES.VIDEO_DETECTED,
      videoInfo: videoInfo
    });
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.overlayInjector) {
      this.overlayInjector.cleanup();
    }
  }
}