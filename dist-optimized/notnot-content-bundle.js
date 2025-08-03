// NotNot Chrome Extension - Optimized Bundle
// Generated: 2025-08-04T00:10:28.509432
(function() {
'use strict';

if (window.notnotContentScriptLoaded) return;
window.notnotContentScriptLoaded = true;

// Module: constants
// NotNot Constants - Central configuration
const CONSTANTS = {
  STORAGE_KEYS: {
    NOTES: 'notnot_notes',
    SETTINGS: 'notnot_settings',
    CURRENT_VIDEO: 'notnot_current_video',
    RECENT_NOTES: 'notnot_recent_notes',
    CAPTURE_AREA: 'notnot_capture_area'
  },
  
  VIDEO_PLATFORMS: {
    YOUTUBE: 'youtube',
    VIMEO: 'vimeo',
    COURSERA: 'coursera',
    UDEMY: 'udemy'
  },
  
  MESSAGES: {
    VIDEO_DETECTED: 'video_detected',
    CAPTURE_SCREENSHOT: 'capture_screenshot',
    DEFINE_CAPTURE_AREA: 'define_capture_area',
    TOGGLE_SIDEBAR: 'toggle_sidebar',
    SAVE_NOTE: 'save_note',
    CHECK_VIDEO: 'CHECK_VIDEO'
  },
  
  UI: {
    SIDEBAR_WIDTH: '500px',
    OVERLAY_Z_INDEX: 9999,
    CAPTURE_QUALITY: 0.92,
    CAPTURE_FORMAT: 'jpeg',
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 1000
  },
  
  SHORTCUTS: {
    CAPTURE: 'Alt+S',
    DEFINE_AREA: 'Alt+Shift+A',
    TOGGLE_NOTES: 'Alt+N'
  },
  
  LIMITS: {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_NOTES_LENGTH: 100000, // characters
    RECENT_NOTES_COUNT: 5
  }
};

// CSS classes for consistent styling
const CSS_CLASSES = {
  // Container classes
  SIDEBAR: 'notnot-sidebar',
  OVERLAY: 'notnot-overlay',
  CAPTURE_AREA: 'notnot-capture-area',
  
  // Button classes
  BUTTON: 'notnot-btn',
  BUTTON_PRIMARY: 'notnot-btn-primary',
  BUTTON_SECONDARY: 'notnot-btn-secondary',
  BUTTON_ACTIVE: 'notnot-btn-active',
  
  // State classes
  VISIBLE: 'notnot-visible',
  HIDDEN: 'notnot-hidden',
  LOADING: 'notnot-loading',
  ERROR: 'notnot-error'
};

// Event names for consistent event handling
const EVENTS = {
  // Custom events
  NOTE_SAVED: 'notnot:note-saved',
  CAPTURE_TAKEN: 'notnot:capture-taken',
  SIDEBAR_TOGGLED: 'notnot:sidebar-toggled',
  
  // DOM events
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  INPUT: 'input',
  CHANGE: 'change'
};

// Module: utils
// NotNot Utilities - Common helper functions

const utils = {
  // ID generation
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Time formatting
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  },

  // YouTube specific helpers
  getVideoTitle() {
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

  getVideoTimestamp() {
    const video = document.querySelector('video');
    return video ? video.currentTime : 0;
  },

  // Debounce function for performance
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
  },

  // Throttle function for performance
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Image compression
  async compressImage(dataUrl, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 1920px width)
        let { width, height } = img;
        const maxWidth = 1920;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  },

  // Text extraction from HTML
  extractTextFromHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  },

  // Get text preview
  getTextPreview(htmlContent, maxLength = 100) {
    const text = this.extractTextFromHtml(htmlContent);
    return text.trim().substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  },

  // Safe JSON parse
  safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('JSON parse error:', e);
      return defaultValue;
    }
  },

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Check if running in iframe
  isInIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  },

  // Event listener with cleanup
  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
  },

  // Batch DOM updates
  batchDOMUpdates(updates) {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
};

// Module: storage-manager
// NotNot Storage Manager - IndexedDB and Chrome Storage integration



class StorageManager {
  constructor() {
    this.dbName = 'NotNotDB';
    this.dbVersion = 1;
    this.db = null;
    this.cache = new Map(); // In-memory cache for performance
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('StorageManager: Failed to open database', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('StorageManager: Database opened successfully');
        
        // Setup error handling for the database
        this.db.onerror = (event) => {
          console.error('StorageManager: Database error', event.target.error);
        };
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('StorageManager: Upgrading database schema');

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('videoUrl', 'videoInfo.url', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          notesStore.createIndex('platform', 'videoInfo.platform', { unique: false });
        }

        // Captures store
        if (!db.objectStoreNames.contains('captures')) {
          const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
          capturesStore.createIndex('noteId', 'noteId', { unique: false });
          capturesStore.createIndex('timestamp', 'timestamp', { unique: false });
          capturesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Note operations
  async saveNote(note) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    
    // Update timestamps
    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) {
      note.createdAt = note.updatedAt;
    }
    
    // Validate note size
    const noteSize = JSON.stringify(note).length;
    if (noteSize > CONSTANTS.LIMITS.MAX_NOTES_LENGTH) {
      throw new Error('Note exceeds maximum size limit');
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(note);
      
      request.onsuccess = () => {
        // Update cache
        this.cache.set(note.id, note);
        
        // Sync to Chrome storage
        this.syncRecentNotesToChromeStorage();
        
        resolve(note);
      };
      
      request.onerror = () => {
        console.error('StorageManager: Failed to save note', request.error);
        reject(request.error);
      };
    });
  }

  async getNoteByVideoUrl(url) {
    // Check cache first
    for (const [_, note] of this.cache) {
      if (note.videoInfo.url === url) {
        return note;
      }
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    const index = store.index('videoUrl');
    
    return new Promise((resolve, reject) => {
      const request = index.get(url);
      
      request.onsuccess = () => {
        const note = request.result;
        if (note) {
          this.cache.set(note.id, note);
        }
        resolve(note);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const notes = request.result || [];
        // Update cache
        notes.forEach(note => this.cache.set(note.id, note));
        resolve(notes);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(noteId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['notes', 'captures'], 'readwrite');
    const notesStore = transaction.objectStore('notes');
    const capturesStore = transaction.objectStore('captures');
    
    // Delete associated captures
    const captureIndex = capturesStore.index('noteId');
    const captures = await this.getCapturesByNoteId(noteId);
    
    captures.forEach(capture => {
      capturesStore.delete(capture.id);
    });
    
    return new Promise((resolve, reject) => {
      const request = notesStore.delete(noteId);
      
      request.onsuccess = () => {
        this.cache.delete(noteId);
        this.syncRecentNotesToChromeStorage();
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Capture operations
  async saveCapture(capture) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Compress image if needed
    if (capture.imageData && capture.imageData.length > CONSTANTS.LIMITS.MAX_IMAGE_SIZE) {
      capture.imageData = await utils.compressImage(capture.imageData, 0.7);
    }

    const transaction = this.db.transaction(['captures'], 'readwrite');
    const store = transaction.objectStore('captures');
    
    return new Promise((resolve, reject) => {
      const request = store.put(capture);
      
      request.onsuccess = () => resolve(capture);
      request.onerror = () => reject(request.error);
    });
  }

  async getCapturesByNoteId(noteId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['captures'], 'readonly');
    const store = transaction.objectStore('captures');
    const index = store.index('noteId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(noteId);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Chrome Storage sync
  async syncRecentNotesToChromeStorage() {
    try {
      const allNotes = await this.getAllNotes();
      
      // Sort by updated date and get recent 5
      const recentNotes = allNotes
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, CONSTANTS.LIMITS.RECENT_NOTES_COUNT)
        .map(note => ({
          id: note.id,
          videoInfo: note.videoInfo,
          updatedAt: note.updatedAt,
          preview: utils.getTextPreview(note.notes.content)
        }));
      
      // Save to Chrome storage
      chrome.storage.local.set({ 
        [CONSTANTS.STORAGE_KEYS.RECENT_NOTES]: recentNotes 
      });
    } catch (error) {
      console.error('StorageManager: Error syncing recent notes:', error);
    }
  }

  // Settings operations
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        const defaultSettings = {
          autoSave: true,
          showOverlay: true,
          captureShortcut: CONSTANTS.SHORTCUTS.CAPTURE,
          defineAreaShortcut: CONSTANTS.SHORTCUTS.DEFINE_AREA,
          captureQuality: CONSTANTS.UI.CAPTURE_QUALITY,
          captureFormat: CONSTANTS.UI.CAPTURE_FORMAT,
          exportFormat: 'pdf',
          includeTimestamps: true
        };
        resolve({ ...defaultSettings, ...(result[CONSTANTS.STORAGE_KEYS.SETTINGS] || {}) });
      });
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ 
        [CONSTANTS.STORAGE_KEYS.SETTINGS]: settings 
      }, resolve);
    });
  }

  // Cleanup
  async cleanup() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
  }
}

// Module: area-selector
// NotNot Area Selector - Capture area selection functionality


class AreaSelector {
  constructor(videoElement, onSelect) {
    this.video = videoElement;
    this.onSelect = onSelect;
    this.overlay = null;
    this.selection = null;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    
    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }
  
  start() {
    console.log('AreaSelector: start() called');
    console.log('AreaSelector: video element:', this.video);
    console.log('AreaSelector: document.body exists?', !!document.body);
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = CSS_CLASSES.CAPTURE_AREA;
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483646;
      cursor: none;
      user-select: none;
    `;
    
    console.log('AreaSelector: overlay created');
    
    // Create selection box
    this.selection = document.createElement('div');
    this.selection.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255, 255, 255, 0.1);
      display: none;
      pointer-events: none;
    `;
    
    // Add dimension display
    this.dimensionDisplay = document.createElement('div');
    this.dimensionDisplay.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
      display: none;
      pointer-events: none;
    `;
    
    // Create custom crosshair cursor
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
    `;
    this.crosshair.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer circle -->
        <circle cx="25" cy="25" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <circle cx="25" cy="25" r="20" fill="none" stroke="black" stroke-width="2" stroke-dasharray="2 2" opacity="0.8"/>
        
        <!-- Crosshair lines -->
        <line x1="25" y1="5" x2="25" y2="20" stroke="white" stroke-width="3"/>
        <line x1="25" y1="5" x2="25" y2="20" stroke="black" stroke-width="1"/>
        
        <line x1="25" y1="30" x2="25" y2="45" stroke="white" stroke-width="3"/>
        <line x1="25" y1="30" x2="25" y2="45" stroke="black" stroke-width="1"/>
        
        <line x1="5" y1="25" x2="20" y2="25" stroke="white" stroke-width="3"/>
        <line x1="5" y1="25" x2="20" y2="25" stroke="black" stroke-width="1"/>
        
        <line x1="30" y1="25" x2="45" y2="25" stroke="white" stroke-width="3"/>
        <line x1="30" y1="25" x2="45" y2="25" stroke="black" stroke-width="1"/>
        
        <!-- Center dot -->
        <circle cx="25" cy="25" r="3" fill="white" opacity="0.9"/>
        <circle cx="25" cy="25" r="2" fill="red"/>
      </svg>
    `;
    
    this.overlay.appendChild(this.selection);
    this.overlay.appendChild(this.dimensionDisplay);
    this.overlay.appendChild(this.crosshair);
    
    console.log('AreaSelector: Appending overlay to document.body');
    try {
      document.body.appendChild(this.overlay);
      console.log('AreaSelector: Overlay appended successfully');
      console.log('AreaSelector: Overlay in DOM?', document.body.contains(this.overlay));
      console.log('AreaSelector: Overlay offsetWidth:', this.overlay.offsetWidth);
      console.log('AreaSelector: Overlay offsetHeight:', this.overlay.offsetHeight);
    } catch (error) {
      console.error('AreaSelector: Failed to append overlay', error);
    }
    
    // Add event listeners
    this.overlay.addEventListener('mousedown', this.handleMouseDown);
    this.overlay.addEventListener('mousemove', this.handleMouseMove);
    this.overlay.addEventListener('mouseup', this.handleMouseUp);
    this.overlay.addEventListener('mouseenter', () => {
      this.crosshair.style.display = 'block';
    });
    this.overlay.addEventListener('mouseleave', () => {
      this.crosshair.style.display = 'none';
    });
    
    // Touch support
    this.overlay.addEventListener('touchstart', this.handleTouchStart);
    this.overlay.addEventListener('touchmove', this.handleTouchMove);
    this.overlay.addEventListener('touchend', this.handleTouchEnd);
    
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Add instruction text
    const instruction = document.createElement('div');
    instruction.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 16px;
      background: rgba(0, 0, 0, 0.8);
      padding: 12px 24px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    `;
    instruction.textContent = '드래그하여 캡처 영역을 선택하세요 (ESC로 취소)';
    this.overlay.appendChild(instruction);
  }
  
  handleMouseDown(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selection.style.display = 'block';
    this.dimensionDisplay.style.display = 'block';
    this.updateSelection(e.clientX, e.clientY);
  }
  
  handleMouseMove(e) {
    // Update crosshair position
    this.crosshair.style.left = (e.clientX - 25) + 'px';
    this.crosshair.style.top = (e.clientY - 25) + 'px';
    
    if (!this.isSelecting) return;
    this.updateSelection(e.clientX, e.clientY);
  }
  
  handleMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.processSelection();
  }
  
  // Touch event handlers
  handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }
  
  handleTouchMove(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp({});
  }
  
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.cleanup();
      this.onSelect(null, true); // Cancelled
    }
  }
  
  updateSelection(currentX, currentY) {
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);
    
    this.selection.style.left = left + 'px';
    this.selection.style.top = top + 'px';
    this.selection.style.width = width + 'px';
    this.selection.style.height = height + 'px';
    
    // Update dimension display
    this.dimensionDisplay.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    this.dimensionDisplay.style.left = (left + width + 10) + 'px';
    this.dimensionDisplay.style.top = top + 'px';
  }
  
  processSelection() {
    const rect = this.selection.getBoundingClientRect();
    const videoRect = this.video.getBoundingClientRect();
    
    // Calculate selection relative to video
    const selection = {
      x: Math.max(0, rect.left - videoRect.left),
      y: Math.max(0, rect.top - videoRect.top),
      width: Math.min(rect.width, videoRect.width - (rect.left - videoRect.left)),
      height: Math.min(rect.height, videoRect.height - (rect.top - videoRect.top))
    };
    
    // Scale to actual video dimensions
    const scaleX = this.video.videoWidth / videoRect.width;
    const scaleY = this.video.videoHeight / videoRect.height;
    
    const scaledSelection = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      width: Math.round(selection.width * scaleX),
      height: Math.round(selection.height * scaleY)
    };
    
    this.cleanup();
    
    // Call callback with selection
    if (selection.width > 10 && selection.height > 10) {
      this.onSelect(scaledSelection);
    } else {
      // If selection too small, capture full frame
      this.onSelect(null);
    }
  }
  
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Clear references
    this.selection = null;
    this.dimensionDisplay = null;
    this.crosshair = null;
  }
}

// Module: capture-handler
// NotNot Capture Handler - Screenshot capture functionality




class CaptureHandler {
  constructor(videoElement, storageManager) {
    this.video = videoElement;
    this.storage = storageManager;
    this.lastCaptureArea = null;
    
    // Load saved capture area
    this.loadCaptureArea();
  }
  
  async loadCaptureArea() {
    try {
      const result = await chrome.storage.local.get(CONSTANTS.STORAGE_KEYS.CAPTURE_AREA);
      this.lastCaptureArea = result[CONSTANTS.STORAGE_KEYS.CAPTURE_AREA] || null;
    } catch (error) {
      console.error('CaptureHandler: Failed to load capture area', error);
    }
  }
  
  async saveCaptureArea(area) {
    this.lastCaptureArea = area;
    try {
      await chrome.storage.local.set({
        [CONSTANTS.STORAGE_KEYS.CAPTURE_AREA]: area
      });
    } catch (error) {
      console.error('CaptureHandler: Failed to save capture area', error);
    }
  }
  
  async capture(showAreaSelector = false) {
    return new Promise((resolve, reject) => {
      // Force area selector if no saved area or explicitly requested
      if (showAreaSelector || !this.lastCaptureArea) {
        const selector = new AreaSelector(this.video, async (area, cancelled) => {
          if (cancelled) {
            resolve(null);
            return;
          }
          
          if (area) {
            await this.saveCaptureArea(area);
          }
          
          const captureData = await this.captureArea(area);
          resolve(captureData);
        });
        selector.start();
      } else {
        // Use last capture area
        this.captureArea(this.lastCaptureArea).then(resolve).catch(reject);
      }
    });
  }
  
  async defineArea() {
    console.log('CaptureHandler: defineArea called');
    console.log('CaptureHandler: video element:', this.video);
    console.log('CaptureHandler: video dimensions:', this.video?.videoWidth, 'x', this.video?.videoHeight);
    
    return new Promise((resolve, reject) => {
      try {
        console.log('CaptureHandler: Creating AreaSelector');
        const selector = new AreaSelector(this.video, async (area, cancelled) => {
          console.log('CaptureHandler: AreaSelector callback called', { area, cancelled });
          
          if (cancelled) {
            this.showToast('영역 선택이 취소되었습니다', 'info');
            resolve(null);
            return;
          }
          
          if (area) {
            await this.saveCaptureArea(area);
            this.showToast('캡처 영역이 설정되었습니다', 'success');
          } else {
            // Full screen selected
            this.resetCaptureArea();
            this.showToast('전체 화면 캡처로 설정되었습니다', 'success');
          }
          
          resolve(area);
        });
        
        console.log('CaptureHandler: Starting AreaSelector');
        selector.start();
        console.log('CaptureHandler: AreaSelector started');
      } catch (error) {
        console.error('CaptureHandler: Error in defineArea', error);
        reject(error);
      }
    });
  }
  
  async captureArea(area = null) {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (area) {
        // Capture specific area
        canvas.width = area.width;
        canvas.height = area.height;
        ctx.drawImage(
          this.video,
          area.x, area.y, area.width, area.height,
          0, 0, area.width, area.height
        );
      } else {
        // Capture full frame
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        ctx.drawImage(this.video, 0, 0);
      }
      
      // Get image data
      let imageData = canvas.toDataURL(
        `image/${CONSTANTS.UI.CAPTURE_FORMAT}`,
        CONSTANTS.UI.CAPTURE_QUALITY
      );
      
      // Compress if needed
      if (imageData.length > CONSTANTS.LIMITS.MAX_IMAGE_SIZE) {
        imageData = await utils.compressImage(imageData, 0.7);
      }
      
      // Create capture object
      const capture = {
        id: utils.generateId(),
        imageData: imageData,
        timestamp: this.video.currentTime,
        videoTimestamp: utils.formatTimestamp(this.video.currentTime),
        dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        area: area,
        createdAt: new Date().toISOString()
      };
      
      return capture;
    } catch (error) {
      console.error('CaptureHandler: Capture failed', error);
      throw error;
    }
  }
  
  resetCaptureArea() {
    this.lastCaptureArea = null;
    chrome.storage.local.remove(CONSTANTS.STORAGE_KEYS.CAPTURE_AREA);
  }
  
  // Toast notification helper
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notnot-toast notnot-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2147483647;
      animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Remove after delay
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, CONSTANTS.UI.TOAST_DURATION);
  }
}

// Module: sidebar-ui
// NotNot Sidebar UI - Note-taking interface



class SidebarUI {
  constructor(storageManager) {
    this.storage = storageManager;
    this.container = null;
    this.isVisible = false;
    this.currentNote = null;
    this.lastCursorPosition = null;
    this.eventCleanup = [];
    
    // Settings
    this.captureShortcut = CONSTANTS.SHORTCUTS.CAPTURE;
    this.settings = {};
    
    // Document-level listeners
    this.documentListeners = null;
  }

  async init() {
    await this.loadSettings();
    this.createSidebar();
    this.setupKeyboardShortcuts();
  }

  async loadSettings() {
    this.settings = await this.storage.getSettings();
    this.captureShortcut = this.settings.captureShortcut || CONSTANTS.SHORTCUTS.CAPTURE;
  }

  createSidebar() {
    // Check if sidebar already exists
    const existingSidebar = document.getElementById('notnot-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'notnot-sidebar';
    this.container.className = CSS_CLASSES.SIDEBAR;
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: -${CONSTANTS.UI.SIDEBAR_WIDTH};
      width: ${CONSTANTS.UI.SIDEBAR_WIDTH};
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      transition: right 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Build sidebar content
    this.buildSidebarContent();
    
    // Add to DOM
    document.body.appendChild(this.container);
  }

  buildSidebarContent() {
    this.container.innerHTML = `
      <div class="notnot-header" style="padding: 20px; border-bottom: 1px solid #e5e7eb; background: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0; color: #6b7280;">NotNot Notes</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="notnot-export-pdf" style="background: white; border: 1px solid #e5e7eb; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; gap: 4px;" title="Export to PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span style="font-size: 12px; color: #6b7280;">PDF</span>
            </button>
            <button id="notnot-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <h1 style="font-size: 20px; font-weight: 700; margin: 0; color: #111827; line-height: 1.3;" id="notnot-video-title">Loading...</h1>
      </div>
      
      <div class="notnot-toolbar" style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
        ${this.createToolbar()}
      </div>
      
      <div class="notnot-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        <div id="notnot-note-editor" contenteditable="true" style="
          min-height: 300px;
          outline: none;
          font-size: 16px;
          line-height: 1.6;
          color: #111827;
        " placeholder="Start taking notes..."></div>
      </div>
      
      <div class="notnot-footer" style="padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="notnot-shortcut-info" style="font-size: 12px; color: #6b7280;">캡처 단축키: ${this.captureShortcut}</span>
          <div style="display: flex; gap: 8px;">
            <button id="notnot-recent-notes" class="notnot-btn-secondary">Recent Notes</button>
            <button id="notnot-import-pdf" class="notnot-btn-secondary">Import PDF</button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  createToolbar() {
    return `
      <button class="notnot-toolbar-btn" data-command="bold" title="Bold (Ctrl+B)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        </svg>
      </button>
      <button class="notnot-toolbar-btn" data-command="italic" title="Italic (Ctrl+I)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="4" x2="10" y2="4"></line>
          <line x1="14" y1="20" x2="5" y2="20"></line>
          <line x1="15" y1="4" x2="9" y2="20"></line>
        </svg>
      </button>
      <button class="notnot-toolbar-btn" data-command="underline" title="Underline (Ctrl+U)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
          <line x1="4" y1="21" x2="20" y2="21"></line>
        </svg>
      </button>
    `;
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .notnot-toolbar-btn {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notnot-toolbar-btn:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }
      
      .notnot-toolbar-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .notnot-btn-secondary {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notnot-btn-secondary:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }
      
      #notnot-note-editor:empty:before {
        content: attr(placeholder);
        color: #9ca3af;
        pointer-events: none;
      }
      
      #notnot-note-editor img {
        max-width: 100%;
        height: auto;
        margin: 10px 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
    this.eventCleanup.push(() => style.remove());
  }

  setupEventListeners() {
    const editor = document.getElementById('notnot-note-editor');
    
    // Auto-save on input
    const saveHandler = utils.debounce(() => {
      this.saveNote();
    }, CONSTANTS.UI.DEBOUNCE_DELAY);
    
    const inputCleanup = utils.addEventListener(editor, 'input', saveHandler);
    this.eventCleanup.push(inputCleanup);

    // Toolbar buttons
    document.querySelectorAll('.notnot-toolbar-btn').forEach(btn => {
      const cleanup = utils.addEventListener(btn, 'click', () => {
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        editor.focus();
      });
      this.eventCleanup.push(cleanup);
    });

    // Close button
    const closeBtn = document.getElementById('notnot-close-btn');
    const closeCleanup = utils.addEventListener(closeBtn, 'click', () => {
      this.toggle();
    });
    this.eventCleanup.push(closeCleanup);

    // Export PDF button
    const exportBtn = document.getElementById('notnot-export-pdf');
    if (exportBtn) {
      const exportCleanup = utils.addEventListener(exportBtn, 'click', () => {
        this.exportToPDF();
      });
      this.eventCleanup.push(exportCleanup);
    }

    // Recent notes button
    const recentBtn = document.getElementById('notnot-recent-notes');
    const recentCleanup = utils.addEventListener(recentBtn, 'click', () => {
      this.showRecentNotes();
    });
    this.eventCleanup.push(recentCleanup);

    // Import PDF button
    const importBtn = document.getElementById('notnot-import-pdf');
    const importCleanup = utils.addEventListener(importBtn, 'click', () => {
      this.importPDF();
    });
    this.eventCleanup.push(importCleanup);
  }

  setupKeyboardShortcuts() {
    // Capture shortcut handler
    this.documentListeners = {
      keydown: (e) => {
        const shortcutParts = this.captureShortcut.toLowerCase().split('+');
        const keyPressed = e.key.toLowerCase();
        
        const hasAlt = shortcutParts.includes('alt') === e.altKey;
        const hasCtrl = shortcutParts.includes('ctrl') === e.ctrlKey;
        const hasShift = shortcutParts.includes('shift') === e.shiftKey;
        const keyMatch = shortcutParts[shortcutParts.length - 1] === keyPressed;
        
        if (hasAlt && hasCtrl && hasShift && keyMatch) {
          e.preventDefault();
          e.stopPropagation();
          
          // Trigger capture through parent
          if (window.notnotVideoDetector && window.notnotVideoDetector.overlayInjector) {
            window.notnotVideoDetector.overlayInjector.handleCapture();
          }
        }
      }
    };

    // Add to document with capture phase
    document.addEventListener('keydown', this.documentListeners.keydown, true);
  }

  async toggle() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.container.style.right = '0';
      await this.updateVideoInfo();
      await this.loadNote();
    } else {
      this.container.style.right = `-${CONSTANTS.UI.SIDEBAR_WIDTH}`;
    }
  }

  async updateVideoInfo() {
    const title = utils.getVideoTitle();
    const titleEl = document.getElementById('notnot-video-title');
    if (titleEl) {
      titleEl.textContent = title;
    }

    // Create or update note
    const videoUrl = window.location.href;
    this.currentNote = await this.storage.getNoteByVideoUrl(videoUrl);
    
    if (!this.currentNote) {
      this.currentNote = {
        id: utils.generateId(),
        videoInfo: {
          title: title,
          url: videoUrl,
          platform: CONSTANTS.VIDEO_PLATFORMS.YOUTUBE
        },
        notes: {
          content: ''
        },
        createdAt: new Date().toISOString()
      };
      await this.storage.saveNote(this.currentNote);
    }
  }

  async loadNote() {
    const editor = document.getElementById('notnot-note-editor');
    if (this.currentNote && this.currentNote.notes.content) {
      editor.innerHTML = this.currentNote.notes.content;
    } else {
      editor.innerHTML = '';
    }
  }

  async saveNote() {
    if (!this.currentNote) return;
    
    const editor = document.getElementById('notnot-note-editor');
    this.currentNote.notes.content = editor.innerHTML;
    await this.storage.saveNote(this.currentNote);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent(EVENTS.NOTE_SAVED, {
      detail: { note: this.currentNote }
    }));
  }

  async addCapture(captureData) {
    console.log('SidebarUI: addCapture called');
    console.log('SidebarUI: storage exists?', !!this.storage);
    console.log('SidebarUI: storage.db exists?', !!this.storage?.db);
    
    if (!this.currentNote) {
      await this.updateVideoInfo();
    }

    // Save capture
    captureData.noteId = this.currentNote.id;
    await this.storage.saveCapture(captureData);

    // Insert into editor
    const editor = document.getElementById('notnot-note-editor');
    const img = document.createElement('img');
    img.src = captureData.imageData;
    img.alt = `Screenshot at ${captureData.videoTimestamp}`;
    img.title = `Captured at ${captureData.videoTimestamp}`;
    
    // Insert at cursor position or append
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.insertNode(img);
      range.collapse(false);
    } else {
      editor.appendChild(img);
    }

    // Save note
    await this.saveNote();
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent(EVENTS.CAPTURE_TAKEN, {
      detail: { capture: captureData }
    }));
  }

  async exportToPDF() {
    if (!this.currentNote) {
      alert('No note to export!');
      return;
    }

    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.currentNote.videoInfo.title} - NotNot Notes</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
          }
          h1 {
            color: #111;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .meta {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 30px;
          }
          .note-content {
            font-size: 16px;
            line-height: 1.8;
          }
          .note-content img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${this.currentNote.videoInfo.title}</h1>
        <div class="meta">
          <p><strong>Platform:</strong> ${this.currentNote.videoInfo.platform}</p>
          <p><strong>URL:</strong> ${this.currentNote.videoInfo.url}</p>
          <p><strong>Last Updated:</strong> ${new Date(this.currentNote.updatedAt).toLocaleString()}</p>
        </div>
        <div class="note-content">
          ${this.currentNote.notes.content || '<p>No notes yet...</p>'}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  async showRecentNotes() {
    // Simple implementation - would be expanded with UI
    const notes = await this.storage.getAllNotes();
    const recentNotes = notes
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, CONSTANTS.LIMITS.RECENT_NOTES_COUNT);
    
    console.log('Recent notes:', recentNotes);
    // TODO: Implement UI for recent notes
  }

  async importPDF() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const editor = document.getElementById('notnot-note-editor');
        editor.innerHTML += `
          <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">📄 ${file.name}</p>
            <iframe src="${e.target.result}" width="100%" height="600" style="border: 1px solid #e5e7eb; border-radius: 4px;"></iframe>
          </div>
        `;
        this.saveNote();
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  }

  destroy() {
    // Remove event listeners
    if (this.documentListeners) {
      document.removeEventListener('keydown', this.documentListeners.keydown, true);
    }
    
    // Clean up other event listeners
    this.eventCleanup.forEach(cleanup => cleanup());
    this.eventCleanup = [];
    
    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}

// Module: overlay-injector
// NotNot Overlay Injector - Video overlay controls





class OverlayInjector {
  constructor(videoElement) {
    this.video = videoElement;
    this.overlay = null;
    this.sidebar = null;
    this.captureHandler = null;
    this.storage = new StorageManager();
    this.captureButtonLongPressTimer = null;
    this.isLongPress = false;
    this.settings = null;
    
    // Event cleanup tracking
    this.eventCleanup = [];
  }

  async init() {
    console.log('OverlayInjector: Initializing...');
    console.log('OverlayInjector: storage exists?', !!this.storage);
    
    // Initialize storage
    try {
      await this.storage.init();
      console.log('OverlayInjector: Storage initialized successfully');
      console.log('OverlayInjector: storage.db exists?', !!this.storage.db);
    } catch (error) {
      console.error('OverlayInjector: Failed to initialize storage:', error);
      throw error;
    }
    
    // Load settings
    this.settings = await this.storage.getSettings();
    
    // Initialize capture handler
    this.captureHandler = new CaptureHandler(this.video, this.storage);
    
    // Create overlay
    this.createOverlay();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Listen for settings changes
    this.setupSettingsListener();
    
    // Load sidebar module dynamically when needed
    this.sidebarLoaded = false;
  }

  createOverlay() {
    // Check if overlay already exists
    if (document.getElementById('notnot-video-overlay')) {
      console.log('OverlayInjector: Overlay already exists');
      return;
    }

    // Create container
    this.overlay = document.createElement('div');
    this.overlay.id = 'notnot-video-overlay';
    this.overlay.className = CSS_CLASSES.OVERLAY;
    this.overlay.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: ${CONSTANTS.UI.OVERLAY_Z_INDEX};
      opacity: 0;
      transition: opacity 0.3s;
    `;

    // Create capture button
    const captureBtn = this.createButton('Capture', 'capture', () => {
      if (!this.isLongPress) {
        this.handleCapture();
      }
    });
    
    // Long press handling for capture button
    this.setupLongPress(captureBtn);

    // Create toggle notes button
    const toggleBtn = this.createButton('Notes', 'notes', () => {
      this.toggleSidebar();
    });

    this.overlay.appendChild(captureBtn);
    this.overlay.appendChild(toggleBtn);

    // Find video container and position overlay
    this.positionOverlay();

    // Show overlay on hover
    this.setupHoverBehavior();
  }

  createButton(text, type, onClick) {
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASSES.BUTTON} notnot-${type}-btn`;
    btn.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    // Add icon
    const icon = this.getButtonIcon(type);
    if (icon) {
      btn.innerHTML = icon + `<span>${text}</span>`;
    } else {
      btn.textContent = text;
    }

    // Hover effect
    const addHover = utils.addEventListener(btn, 'mouseenter', () => {
      btn.style.background = 'rgba(59, 130, 246, 0.9)';
      btn.style.transform = 'scale(1.05)';
    });

    const removeHover = utils.addEventListener(btn, 'mouseleave', () => {
      btn.style.background = 'rgba(0, 0, 0, 0.8)';
      btn.style.transform = 'scale(1)';
    });

    // Click handler
    const clickCleanup = utils.addEventListener(btn, 'click', onClick);

    // Track cleanup functions
    this.eventCleanup.push(addHover, removeHover, clickCleanup);

    return btn;
  }

  getButtonIcon(type) {
    const icons = {
      capture: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`,
      notes: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>`
    };
    return icons[type] || '';
  }

  setupLongPress(button) {
    const startLongPress = () => {
      this.isLongPress = false;
      this.captureButtonLongPressTimer = setTimeout(() => {
        this.isLongPress = true;
        this.captureHandler.resetCaptureArea();
        this.captureHandler.showToast('캡처 영역이 초기화되었습니다', 'success');
        
        // Visual feedback
        button.style.animation = 'pulse 0.5s';
        setTimeout(() => {
          button.style.animation = '';
        }, 500);
      }, 1000);
    };

    const cancelLongPress = () => {
      if (this.captureButtonLongPressTimer) {
        clearTimeout(this.captureButtonLongPressTimer);
        this.captureButtonLongPressTimer = null;
      }
    };

    const mouseDown = utils.addEventListener(button, 'mousedown', startLongPress);
    const mouseUp = utils.addEventListener(button, 'mouseup', cancelLongPress);
    const mouseLeave = utils.addEventListener(button, 'mouseleave', cancelLongPress);
    const touchStart = utils.addEventListener(button, 'touchstart', startLongPress);
    const touchEnd = utils.addEventListener(button, 'touchend', cancelLongPress);

    this.eventCleanup.push(mouseDown, mouseUp, mouseLeave, touchStart, touchEnd);
  }

  positionOverlay() {
    const videoContainer = this.video.closest('.html5-video-player') || this.video.parentElement;
    
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(this.overlay);
    } else {
      // Fallback to body
      document.body.appendChild(this.overlay);
    }
  }

  setupHoverBehavior() {
    const showOverlay = () => {
      this.overlay.style.opacity = '1';
    };

    const hideOverlay = () => {
      this.overlay.style.opacity = '0';
    };

    // Show on video hover
    const videoEnter = utils.addEventListener(this.video, 'mouseenter', showOverlay);
    const videoLeave = utils.addEventListener(this.video, 'mouseleave', hideOverlay);
    
    // Keep visible when hovering overlay
    const overlayEnter = utils.addEventListener(this.overlay, 'mouseenter', showOverlay);
    const overlayLeave = utils.addEventListener(this.overlay, 'mouseleave', hideOverlay);

    this.eventCleanup.push(videoEnter, videoLeave, overlayEnter, overlayLeave);
  }

  async handleCapture(forceAreaSelector = false) {
    console.log('OverlayInjector: Handling capture');
    
    try {
      const captureData = await this.captureHandler.capture(forceAreaSelector);
      
      if (captureData) {
        // Ensure sidebar is open
        if (!this.sidebar || !this.sidebar.isVisible) {
          await this.toggleSidebar();
          // Wait for sidebar to be ready
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Add capture to sidebar
        if (this.sidebar) {
          await this.sidebar.addCapture(captureData);
          this.captureHandler.showToast('스크린샷이 캡처되었습니다', 'success');
        }
      }
    } catch (error) {
      console.error('OverlayInjector: Capture failed', error);
      this.captureHandler.showToast('캡처 실패', 'error');
    }
  }

  async toggleSidebar() {
    if (!this.sidebarLoaded) {
      // Load sidebar module
      const { SidebarUI } = await import('./sidebar-ui.js');
      this.sidebar = new SidebarUI(this.storage);
      await this.sidebar.init();
      this.sidebarLoaded = true;
    }
    
    this.sidebar.toggle();
  }
  
  setupKeyboardShortcuts() {
    const handleKeyDown = (e) => {
      const captureShortcut = this.settings?.captureShortcut || CONSTANTS.SHORTCUTS.CAPTURE;
      const defineAreaShortcut = this.settings?.defineAreaShortcut || CONSTANTS.SHORTCUTS.DEFINE_AREA;
      
      // Debug logging
      if (e.altKey && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's')) {
        console.log('OverlayInjector: Key pressed:', e.key, 'Alt:', e.altKey, 'Shift:', e.shiftKey);
        console.log('OverlayInjector: Define Area Shortcut:', defineAreaShortcut);
        console.log('OverlayInjector: Capture Shortcut:', captureShortcut);
        console.log('OverlayInjector: Current settings:', this.settings);
      }
      
      // Check if either shortcut matches
      const isCaptureShortcut = this.checkShortcut(e, captureShortcut);
      const isDefineAreaShortcut = this.checkShortcut(e, defineAreaShortcut);
      
      // For capture shortcut, check if we're in an input field (but not for define area)
      if (isCaptureShortcut) {
        const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';
        if (isInInput) {
          return; // Don't capture in input fields
        }
        e.preventDefault();
        e.stopPropagation();
        console.log('OverlayInjector: Triggering capture');
        this.handleCapture();
      } else if (isDefineAreaShortcut) {
        // Define area should work everywhere, including in editors
        e.preventDefault();
        e.stopPropagation();
        console.log('OverlayInjector: Triggering define area');
        this.handleDefineArea();
      }
    };
    
    // Add keyboard listener at document level with capture phase
    const keydownCleanup = utils.addEventListener(document, 'keydown', handleKeyDown, true);
    this.eventCleanup.push(keydownCleanup);
    
    // Also add to window for better coverage
    const windowKeydownCleanup = utils.addEventListener(window, 'keydown', handleKeyDown, true);
    this.eventCleanup.push(windowKeydownCleanup);
    
    console.log('OverlayInjector: Keyboard shortcuts set up with shortcuts:', {
      capture: this.settings?.captureShortcut || CONSTANTS.SHORTCUTS.CAPTURE,
      defineArea: this.settings?.defineAreaShortcut || CONSTANTS.SHORTCUTS.DEFINE_AREA
    });
  }
  
  checkShortcut(event, shortcut) {
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
    
    return (
      event.ctrlKey === modifiers.ctrl &&
      event.altKey === modifiers.alt &&
      event.shiftKey === modifiers.shift &&
      event.metaKey === modifiers.meta &&
      eventKey === key
    );
  }
  
  async handleDefineArea() {
    console.log('OverlayInjector: Handling define area');
    console.log('OverlayInjector: captureHandler exists?', !!this.captureHandler);
    console.log('OverlayInjector: video element exists?', !!this.video);
    
    if (!this.captureHandler) {
      console.error('OverlayInjector: captureHandler is not initialized');
      return;
    }
    
    try {
      console.log('OverlayInjector: Calling captureHandler.defineArea()');
      await this.captureHandler.defineArea();
      console.log('OverlayInjector: defineArea completed');
    } catch (error) {
      console.error('OverlayInjector: Define area failed', error);
      this.captureHandler.showToast('영역 설정 실패', 'error');
    }
  }

  cleanup() {
    console.log('OverlayInjector: Cleaning up...');
    
    // Remove overlay
    if (this.overlay) {
      this.overlay.remove();
    }
    
    // Cleanup sidebar
    if (this.sidebar) {
      this.sidebar.destroy();
    }
    
    // Cleanup storage
    if (this.storage) {
      this.storage.cleanup();
    }
    
    // Remove all event listeners
    this.eventCleanup.forEach(cleanup => cleanup());
    this.eventCleanup = [];
  }
  
  // Update settings when changed
  async updateSettings() {
    this.settings = await this.storage.getSettings();
  }
  
  setupSettingsListener() {
    // Listen for changes to settings
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEYS.SETTINGS]) {
        console.log('OverlayInjector: Settings changed, updating...');
        this.updateSettings();
      }
    });
  }
}

// Module: video-detector
// NotNot Video Detector - YouTube video detection and initialization



class VideoDetector {
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

// Initialize
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
})();