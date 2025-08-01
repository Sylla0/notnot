// Utility functions
export const utils = {
  // Generate unique ID
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Format timestamp to readable time
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  // Detect video platform
  detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('coursera.org')) return 'coursera';
    if (url.includes('udemy.com')) return 'udemy';
    if (url.includes('edx.org')) return 'edx';
    return 'other';
  },

  // Extract video title
  getVideoTitle() {
    // Try various selectors for different platforms
    const titleSelectors = [
      'h1.ytd-video-primary-info-renderer', // YouTube
      'h1.title', // Generic
      '.vp-title', // Vimeo
      'h1[data-purpose="video-title"]', // Udemy
      '.video-title' // Generic
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }

    return document.title || 'Untitled Video';
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};