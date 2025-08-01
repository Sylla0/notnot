import { CONSTANTS } from '../shared/constants.js';
import { utils } from '../shared/utils.js';

class VideoDetector {
  constructor() {
    this.video = null;
    this.observer = null;
    this.platform = utils.detectPlatform(window.location.href);
  }

  init() {
    // Try to find video immediately
    this.findVideo();

    // Set up observer for dynamically loaded videos
    this.observeForVideos();
  }

  findVideo() {
    const videoSelectors = [
      'video',
      'video.html5-main-video', // YouTube
      'video.vjs-tech', // Video.js
      'video.video-stream', // Various platforms
      'video[src]',
      'video source'
    ];

    for (const selector of videoSelectors) {
      const videos = document.querySelectorAll(selector);
      if (videos.length > 0) {
        this.video = videos[0];
        if (selector === 'video source' && videos[0].parentElement) {
          this.video = videos[0].parentElement;
        }
        this.onVideoFound();
        return true;
      }
    }
    return false;
  }

  observeForVideos() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.video) {
        this.findVideo();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  onVideoFound() {
    console.log('NotNot: Video detected!', this.video);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: CONSTANTS.MESSAGES.VIDEO_DETECTED,
      data: {
        url: window.location.href,
        title: utils.getVideoTitle(),
        platform: this.platform
      }
    });

    // Initialize overlay UI
    this.initializeOverlay();
  }

  initializeOverlay() {
    // Import and initialize overlay injector
    import('./overlay-injector.js').then(module => {
      const overlayInjector = new module.OverlayInjector(this.video);
      overlayInjector.inject();
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize video detector when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const detector = new VideoDetector();
    detector.init();
  });
} else {
  const detector = new VideoDetector();
  detector.init();
}