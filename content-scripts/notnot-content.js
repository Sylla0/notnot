// NotNot Content Script - YouTube Focus Version
console.log('NotNot: Content script loaded');

// Constants
const CONSTANTS = {
  STORAGE_KEYS: {
    NOTES: 'notnot_notes',
    SETTINGS: 'notnot_settings',
    CURRENT_VIDEO: 'notnot_current_video'
  },
  
  VIDEO_PLATFORMS: {
    YOUTUBE: 'youtube'
  },
  
  MESSAGES: {
    VIDEO_DETECTED: 'video_detected',
    CAPTURE_SCREENSHOT: 'capture_screenshot',
    TOGGLE_SIDEBAR: 'toggle_sidebar',
    SAVE_NOTE: 'save_note',
    START_RECORDING: 'start_recording',
    STOP_RECORDING: 'stop_recording'
  },
  
  UI: {
    SIDEBAR_WIDTH: '400px',
    OVERLAY_Z_INDEX: 9999,
    CAPTURE_QUALITY: 0.92
  }
};

// Utility functions
const utils = {
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  getVideoTitle() {
    // YouTube specific selectors
    const titleSelectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1 yt-formatted-string.ytd-video-primary-info-renderer',
      'h1.title.ytd-video-primary-info-renderer',
      '.ytp-title-link'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }

    return document.title.replace(' - YouTube', '') || 'Untitled Video';
  },

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

// Capture Handler
class CaptureHandler {
  constructor(videoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async captureFrame() {
    console.log('NotNot: Capturing frame');
    
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    const imageData = this.canvas.toDataURL('image/jpeg', CONSTANTS.UI.CAPTURE_QUALITY);

    const capture = {
      id: utils.generateId(),
      timestamp: this.video.currentTime,
      imageData: imageData,
      videoUrl: window.location.href,
      videoTitle: utils.getVideoTitle(),
      createdAt: new Date().toISOString(),
      annotations: [],
      extractedText: ''
    };

    console.log('NotNot: Frame captured', capture);
    return capture;
  }
}

// Sidebar UI Component
class SidebarUI {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.currentNote = null;
    this.storage = new StorageManager();
  }

  async init() {
    await this.storage.init();
    this.createSidebar();
  }

  createSidebar() {
    console.log('NotNot: Creating sidebar UI');
    
    // Create sidebar container
    this.container = document.createElement('div');
    this.container.id = 'notnot-sidebar';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: -${CONSTANTS.UI.SIDEBAR_WIDTH};
      width: ${CONSTANTS.UI.SIDEBAR_WIDTH};
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: ${CONSTANTS.UI.OVERLAY_Z_INDEX + 1};
      transition: right 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    `;
    header.innerHTML = `
      <h2 style="font-size: 18px; font-weight: 600; margin: 0;">NotNot Notes</h2>
      <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;" id="notnot-video-title">Loading...</p>
    `;

    // Create tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    `;
    tabs.innerHTML = `
      <button class="notnot-tab active" data-tab="notes" style="flex: 1; padding: 12px; border: none; background: none; font-size: 14px; font-weight: 500; cursor: pointer;">Notes</button>
      <button class="notnot-tab" data-tab="captures" style="flex: 1; padding: 12px; border: none; background: none; font-size: 14px; font-weight: 500; cursor: pointer;">Captures</button>
    `;

    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    `;

    // Notes tab
    const notesTab = document.createElement('div');
    notesTab.id = 'notnot-notes-tab';
    notesTab.className = 'notnot-tab-content';
    notesTab.innerHTML = `
      <div contenteditable="true" id="notnot-note-editor" style="min-height: 200px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; outline: none;" placeholder="Start taking notes..."></div>
    `;

    // Captures tab
    const capturesTab = document.createElement('div');
    capturesTab.id = 'notnot-captures-tab';
    capturesTab.className = 'notnot-tab-content';
    capturesTab.style.display = 'none';
    capturesTab.innerHTML = `
      <div id="notnot-captures-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;"></div>
    `;

    content.appendChild(notesTab);
    content.appendChild(capturesTab);

    // Assemble sidebar
    this.container.appendChild(header);
    this.container.appendChild(tabs);
    this.container.appendChild(content);

    // Add to page
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tab switching
    this.container.querySelectorAll('.notnot-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Note saving
    const editor = document.getElementById('notnot-note-editor');
    editor.addEventListener('input', utils.debounce(() => {
      this.saveNote();
    }, 1000));
  }

  switchTab(tabName) {
    // Update tab buttons
    this.container.querySelectorAll('.notnot-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
        tab.style.borderBottom = '2px solid #3b82f6';
      } else {
        tab.classList.remove('active');
        tab.style.borderBottom = 'none';
      }
    });

    // Update content
    if (tabName === 'notes') {
      document.getElementById('notnot-notes-tab').style.display = 'block';
      document.getElementById('notnot-captures-tab').style.display = 'none';
    } else {
      document.getElementById('notnot-notes-tab').style.display = 'none';
      document.getElementById('notnot-captures-tab').style.display = 'block';
    }
  }

  toggle() {
    console.log('NotNot: Toggling sidebar');
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.container.style.right = '0';
      this.updateVideoInfo();
      this.loadNote();
    } else {
      this.container.style.right = `-${CONSTANTS.UI.SIDEBAR_WIDTH}`;
    }
  }

  async updateVideoInfo() {
    const title = utils.getVideoTitle();
    document.getElementById('notnot-video-title').textContent = title;

    // Create or load note for this video
    const videoUrl = window.location.href;
    this.currentNote = await this.storage.getNoteByVideoUrl(videoUrl);
    
    if (!this.currentNote) {
      this.currentNote = {
        id: utils.generateId(),
        videoInfo: {
          url: videoUrl,
          title: title,
          platform: 'youtube'
        },
        captures: [],
        notes: {
          content: ''
        },
        createdAt: new Date().toISOString()
      };
      await this.storage.saveNote(this.currentNote);
    }
  }

  async loadNote() {
    if (this.currentNote) {
      const editor = document.getElementById('notnot-note-editor');
      editor.innerHTML = this.currentNote.notes.content || '';
      
      // Load captures
      const capturesGrid = document.getElementById('notnot-captures-grid');
      capturesGrid.innerHTML = '';
      
      const captures = await this.storage.getCapturesByNoteId(this.currentNote.id);
      captures.forEach(capture => this.displayCapture(capture));
    }
  }

  async saveNote() {
    if (!this.currentNote) return;
    
    const editor = document.getElementById('notnot-note-editor');
    this.currentNote.notes.content = editor.innerHTML;
    await this.storage.saveNote(this.currentNote);
  }

  async addCapture(captureData) {
    if (!this.currentNote) return;
    
    captureData.noteId = this.currentNote.id;
    await this.storage.saveCapture(captureData);
    this.displayCapture(captureData);
    
    // Switch to captures tab
    this.switchTab('captures');
  }

  displayCapture(capture) {
    const capturesGrid = document.getElementById('notnot-captures-grid');
    
    const captureItem = document.createElement('div');
    captureItem.style.cssText = `
      position: relative;
      cursor: pointer;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;
    
    captureItem.innerHTML = `
      <img src="${capture.imageData}" style="width: 100%; height: auto; display: block;">
      <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0, 0, 0, 0.7); color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
        ${utils.formatTimestamp(capture.timestamp)}
      </span>
    `;
    
    captureItem.addEventListener('click', () => {
      // Insert into notes
      const editor = document.getElementById('notnot-note-editor');
      editor.innerHTML += `<img src="${capture.imageData}" style="max-width: 100%; margin: 8px 0;">`;
      this.saveNote();
      this.switchTab('notes');
    });
    
    capturesGrid.appendChild(captureItem);
  }
}

// Storage Manager
class StorageManager {
  constructor() {
    this.dbName = 'NotNotDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('videoUrl', 'videoInfo.url', { unique: false });
        }

        if (!db.objectStoreNames.contains('captures')) {
          const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
          capturesStore.createIndex('noteId', 'noteId', { unique: false });
        }
      };
    });
  }

  async saveNote(note) {
    const transaction = this.db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    
    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) {
      note.createdAt = note.updatedAt;
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve(note);
      request.onerror = () => reject(request.error);
    });
  }

  async getNoteByVideoUrl(url) {
    const transaction = this.db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const index = store.index('videoUrl');
    
    return new Promise((resolve, reject) => {
      const request = index.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCapture(capture) {
    const transaction = this.db.transaction(['captures'], 'readwrite');
    const store = transaction.objectStore('captures');
    
    return new Promise((resolve, reject) => {
      const request = store.put(capture);
      request.onsuccess = () => resolve(capture);
      request.onerror = () => reject(request.error);
    });
  }

  async getCapturesByNoteId(noteId) {
    const transaction = this.db.transaction(['captures'], 'readonly');
    const store = transaction.objectStore('captures');
    const index = store.index('noteId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(noteId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}

// Overlay Injector
class OverlayInjector {
  constructor(videoElement) {
    this.video = videoElement;
    this.overlay = null;
    this.sidebar = new SidebarUI();
  }

  async inject() {
    console.log('NotNot: Injecting overlay');
    await this.sidebar.init();
    this.createOverlay();
    this.attachEventListeners();
  }

  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'notnot-overlay';
    this.overlay.innerHTML = `
      <div class="notnot-controls">
        <button class="notnot-btn notnot-capture" title="Capture Screenshot">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="notnot-btn notnot-toggle-notes" title="Toggle Notes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </button>
        <div class="notnot-timestamp">00:00</div>
      </div>
    `;

    // Find the video container to position overlay correctly
    const videoContainer = this.video.closest('.html5-video-player') || this.video.parentElement;
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(this.overlay);

    console.log('NotNot: Overlay created');
    this.updateTimestamp();
  }

  attachEventListeners() {
    // Capture button
    const captureBtn = this.overlay.querySelector('.notnot-capture');
    captureBtn.addEventListener('click', () => this.handleCapture());

    // Toggle notes button
    const toggleBtn = this.overlay.querySelector('.notnot-toggle-notes');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // Update timestamp on video time update
    this.video.addEventListener('timeupdate', () => this.updateTimestamp());
  }

  async handleCapture() {
    console.log('NotNot: Handle capture clicked');
    const captureHandler = new CaptureHandler(this.video);
    const capture = await captureHandler.captureFrame();
    
    await this.sidebar.addCapture(capture);
    
    // Show sidebar if hidden
    if (!this.sidebar.isVisible) {
      this.sidebar.toggle();
    }
  }

  toggleSidebar() {
    console.log('NotNot: Toggle sidebar clicked');
    this.sidebar.toggle();
  }

  updateTimestamp() {
    const timestampEl = this.overlay.querySelector('.notnot-timestamp');
    if (timestampEl && this.video) {
      timestampEl.textContent = utils.formatTimestamp(this.video.currentTime);
    }
  }
}

// Video Detector
class VideoDetector {
  constructor() {
    this.video = null;
    this.observer = null;
    this.overlayInjector = null;
    this.retryCount = 0;
    this.maxRetries = 10;
  }

  init() {
    console.log('NotNot: VideoDetector initialized');
    this.findVideo();
    this.observeForVideos();
  }

  findVideo() {
    console.log('NotNot: Looking for video element...');
    
    // YouTube specific video selector
    const video = document.querySelector('video.html5-main-video, video.video-stream');
    
    if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
      console.log('NotNot: Video found and ready');
      this.video = video;
      this.onVideoFound();
      return true;
    } else if (video) {
      console.log('NotNot: Video found but not ready, waiting...');
      this.video = video;
      
      // Wait for video to be ready
      video.addEventListener('loadeddata', () => {
        console.log('NotNot: Video is now ready');
        this.onVideoFound();
      }, { once: true });
      
      return true;
    }
    
    console.log('NotNot: No video found yet');
    return false;
  }

  observeForVideos() {
    if (this.observer) return;
    
    console.log('NotNot: Setting up observer for videos');
    
    this.observer = new MutationObserver((mutations) => {
      if (!this.video && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`NotNot: Retry ${this.retryCount} - Looking for video...`);
        this.findVideo();
      }
    });

    // Observe the entire body for changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  onVideoFound() {
    console.log('NotNot: Video detected! Initializing UI...');
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: CONSTANTS.MESSAGES.VIDEO_DETECTED,
      data: {
        url: window.location.href,
        title: utils.getVideoTitle(),
        platform: 'youtube'
      }
    }).catch(err => console.log('NotNot: Failed to send message to background', err));

    // Initialize overlay UI
    this.initializeOverlay();
  }

  async initializeOverlay() {
    console.log('NotNot: Initializing overlay');
    this.overlayInjector = new OverlayInjector(this.video);
    await this.overlayInjector.inject();
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Message listener for commands from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('NotNot: Message received', request);
  
  if (request.type === 'CHECK_VIDEO') {
    // Check if video is detected
    const hasVideo = videoDetector && videoDetector.video && videoDetector.overlayInjector;
    const title = hasVideo ? utils.getVideoTitle() : null;
    sendResponse({ hasVideo, title });
  } else if (request.type === CONSTANTS.MESSAGES.TOGGLE_SIDEBAR) {
    if (videoDetector && videoDetector.overlayInjector) {
      videoDetector.overlayInjector.toggleSidebar();
      sendResponse({success: true});
    } else {
      console.log('NotNot: No video detector or overlay injector available');
      sendResponse({success: false, error: 'No video detected'});
    }
  } else if (request.type === CONSTANTS.MESSAGES.CAPTURE_SCREENSHOT) {
    if (videoDetector && videoDetector.overlayInjector) {
      videoDetector.overlayInjector.handleCapture();
      sendResponse({success: true});
    } else {
      sendResponse({success: false, error: 'No video detected'});
    }
  }
  
  return true; // Keep message channel open for async response
});

// Initialize video detector
let videoDetector;

// YouTube navigation handling
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('NotNot: URL changed, reinitializing...');
    
    // Cleanup old instance
    if (videoDetector) {
      videoDetector.destroy();
    }
    
    // Wait a bit for new page to load
    setTimeout(() => {
      videoDetector = new VideoDetector();
      videoDetector.init();
    }, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Initial load
console.log('NotNot: Starting initial video detection');
videoDetector = new VideoDetector();
videoDetector.init();