// NotNot Content Script - YouTube Focus Version (Optimized)
(function() {
  if (window.notnotContentScriptLoaded) {
    return;
  }
  window.notnotContentScriptLoaded = true;

  // Production mode flag
  const IS_PRODUCTION = !window.location.hostname.includes('localhost');
  
  // Optimized logging
  const logger = {
    log: IS_PRODUCTION ? () => {} : console.log.bind(console, '[NotNot]'),
    error: console.error.bind(console, '[NotNot]'),
    warn: IS_PRODUCTION ? () => {} : console.warn.bind(console, '[NotNot]'),
    debug: IS_PRODUCTION ? () => {} : console.debug.bind(console, '[NotNot]')
  };

  logger.log('Content script loaded');

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
      CAPTURE_QUALITY: 0.92,
      DEBOUNCE_DELAY: 1000,
      THROTTLE_DELAY: 100
    },
    
    PERFORMANCE: {
      MAX_IMAGE_WIDTH: 1920,
      IMAGE_QUALITY_THRESHOLD: 5 * 1024 * 1024, // 5MB
      CACHE_SIZE: 50
    }
  };

  // Performance monitoring
  const performanceMonitor = {
    marks: new Map(),
    
    start(label) {
      this.marks.set(label, performance.now());
    },
    
    end(label) {
      const start = this.marks.get(label);
      if (start) {
        const duration = performance.now() - start;
        this.marks.delete(label);
        logger.debug(`${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
      return 0;
    }
  };

  // Memory-efficient cache
  class LRUCache {
    constructor(maxSize = 50) {
      this.maxSize = maxSize;
      this.cache = new Map();
    }
    
    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    
    set(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      } else if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
    }
    
    clear() {
      this.cache.clear();
    }
  }

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
      const titleSelectors = [
        'h1.ytd-watch-metadata yt-formatted-string',
        'h1 yt-formatted-string.ytd-video-primary-info-renderer',
        'h1.title.ytd-video-primary-info-renderer',
        '.ytp-title-link'
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          return element.textContent.trim();
        }
      }

      return document.title.replace(' - YouTube', '') || 'Untitled Video';
    },

    debounce(func, wait = CONSTANTS.UI.DEBOUNCE_DELAY) {
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
    
    throttle(func, limit = CONSTANTS.UI.THROTTLE_DELAY) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },
    
    // Optimized image compression
    async compressImage(dataUrl, maxWidth = CONSTANTS.PERFORMANCE.MAX_IMAGE_WIDTH) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Dynamic quality based on image size
          const size = dataUrl.length;
          let quality = CONSTANTS.UI.CAPTURE_QUALITY;
          
          if (size > CONSTANTS.PERFORMANCE.IMAGE_QUALITY_THRESHOLD) {
            quality = 0.7;
          } else if (size > CONSTANTS.PERFORMANCE.IMAGE_QUALITY_THRESHOLD / 2) {
            quality = 0.8;
          }
          
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
      });
    }
  };

  // Event cleanup management
  class EventManager {
    constructor() {
      this.listeners = new Map();
      this.cleanupFunctions = [];
    }
    
    addEventListener(element, event, handler, options) {
      const wrappedHandler = (e) => {
        try {
          handler(e);
        } catch (error) {
          logger.error('Event handler error:', error);
        }
      };
      
      element.addEventListener(event, wrappedHandler, options);
      
      if (!this.listeners.has(element)) {
        this.listeners.set(element, []);
      }
      
      this.listeners.get(element).push({ event, handler: wrappedHandler, options });
      
      return () => this.removeEventListener(element, event, wrappedHandler, options);
    }
    
    removeEventListener(element, event, handler, options) {
      element.removeEventListener(event, handler, options);
      
      const elementListeners = this.listeners.get(element);
      if (elementListeners) {
        const index = elementListeners.findIndex(
          l => l.event === event && l.handler === handler
        );
        if (index !== -1) {
          elementListeners.splice(index, 1);
        }
        if (elementListeners.length === 0) {
          this.listeners.delete(element);
        }
      }
    }
    
    addCleanup(fn) {
      this.cleanupFunctions.push(fn);
    }
    
    cleanup() {
      // Remove all event listeners
      for (const [element, listeners] of this.listeners) {
        for (const { event, handler, options } of listeners) {
          element.removeEventListener(event, handler, options);
        }
      }
      this.listeners.clear();
      
      // Execute cleanup functions
      for (const fn of this.cleanupFunctions) {
        try {
          fn();
        } catch (error) {
          logger.error('Cleanup error:', error);
        }
      }
      this.cleanupFunctions = [];
    }
  }

  const eventManager = new EventManager();

  // Area Selection for Capture
  class AreaSelector {
    constructor(videoElement, onSelect) {
      this.video = videoElement;
      this.onSelect = onSelect;
      this.overlay = null;
      this.selection = null;
      this.isSelecting = false;
      this.startX = 0;
      this.startY = 0;
    }
    
    start() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'notnot-area-selector-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2147483646;
        cursor: crosshair;
      `;
      
      this.selection = document.createElement('div');
      this.selection.className = 'notnot-area-selection';
      this.selection.style.cssText = `
        position: absolute;
        border: 2px dashed #fff;
        background: rgba(255, 255, 255, 0.1);
        display: none;
      `;
      
      this.overlay.appendChild(this.selection);
      document.body.appendChild(this.overlay);
      
      // Use EventManager for automatic cleanup
      eventManager.addEventListener(this.overlay, 'mousedown', this.handleMouseDown.bind(this));
      eventManager.addEventListener(this.overlay, 'mousemove', this.handleMouseMove.bind(this));
      eventManager.addEventListener(this.overlay, 'mouseup', this.handleMouseUp.bind(this));
      eventManager.addEventListener(document, 'keydown', this.handleKeyDown.bind(this));
      
      const instruction = document.createElement('div');
      instruction.className = 'notnot-area-instruction';
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
      `;
      instruction.textContent = '드래그하여 캡처 영역을 선택하세요 (ESC로 취소)';
      this.overlay.appendChild(instruction);
    }
    
    handleMouseDown(e) {
      this.isSelecting = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.selection.style.display = 'block';
      this.updateSelection(e.clientX, e.clientY);
    }
    
    handleMouseMove(e) {
      if (!this.isSelecting) return;
      requestAnimationFrame(() => this.updateSelection(e.clientX, e.clientY));
    }
    
    handleMouseUp(e) {
      if (!this.isSelecting) return;
      this.isSelecting = false;
      
      const rect = this.selection.getBoundingClientRect();
      const videoRect = this.video.getBoundingClientRect();
      
      const selection = {
        x: Math.max(0, rect.left - videoRect.left),
        y: Math.max(0, rect.top - videoRect.top),
        width: Math.min(rect.width, videoRect.width),
        height: Math.min(rect.height, videoRect.height)
      };
      
      const scaleX = this.video.videoWidth / videoRect.width;
      const scaleY = this.video.videoHeight / videoRect.height;
      
      const scaledSelection = {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY
      };
      
      this.cleanup();
      
      if (selection.width > 10 && selection.height > 10) {
        this.onSelect(scaledSelection);
      } else {
        this.onSelect(null);
      }
    }
    
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.cleanup();
      }
    }
    
    updateSelection(currentX, currentY) {
      const left = Math.min(this.startX, currentX);
      const top = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);
      
      Object.assign(this.selection.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
    
    cleanup() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
        this.selection = null;
      }
    }
  }

  // Capture Handler
  class CaptureHandler {
    constructor(videoElement, storageManager) {
      this.video = videoElement;
      this.storage = storageManager;
      this.cache = new LRUCache(10);
    }
    
    async captureFrame(selection = null) {
      performanceMonitor.start('captureFrame');
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (selection) {
          canvas.width = selection.width;
          canvas.height = selection.height;
          ctx.drawImage(
            this.video,
            selection.x, selection.y, selection.width, selection.height,
            0, 0, selection.width, selection.height
          );
        } else {
          canvas.width = this.video.videoWidth;
          canvas.height = this.video.videoHeight;
          ctx.drawImage(this.video, 0, 0);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', CONSTANTS.UI.CAPTURE_QUALITY);
        
        // Compress if needed
        const compressedUrl = await utils.compressImage(dataUrl);
        
        const captureData = {
          id: utils.generateId(),
          timestamp: this.video.currentTime,
          url: compressedUrl,
          videoUrl: window.location.href,
          videoTitle: utils.getVideoTitle(),
          capturedAt: new Date().toISOString()
        };
        
        performanceMonitor.end('captureFrame');
        
        return captureData;
      } catch (error) {
        logger.error('Capture failed:', error);
        performanceMonitor.end('captureFrame');
        throw error;
      }
    }
    
    async captureArea() {
      return new Promise((resolve) => {
        const selector = new AreaSelector(this.video, async (selection) => {
          try {
            const captureData = await this.captureFrame(selection);
            resolve(captureData);
          } catch (error) {
            logger.error('Area capture failed:', error);
            resolve(null);
          }
        });
        selector.start();
      });
    }
    
    captureFullFrame() {
      return this.captureFrame(null);
    }
  }

  // Sidebar UI (Optimized)
  class SidebarUI {
    constructor(storageManager) {
      this.storage = storageManager;
      this.container = null;
      this.currentNote = null;
      this.editor = null;
      this.isVisible = false;
      this.autoSaveTimeout = null;
      this.capturesCache = new LRUCache(20);
    }
    
    async loadSettings() {
      return new Promise((resolve) => {
        chrome.storage.local.get(CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
          resolve(result[CONSTANTS.STORAGE_KEYS.SETTINGS] || {
            sidebarPosition: 'right',
            autoSave: true,
            theme: 'light'
          });
        });
      });
    }
    
    create() {
      if (this.container) return;
      
      this.container = document.createElement('div');
      this.container.id = 'notnot-sidebar';
      this.container.className = 'notnot-sidebar';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        right: -${CONSTANTS.UI.SIDEBAR_WIDTH};
        width: ${CONSTANTS.UI.SIDEBAR_WIDTH};
        height: 100%;
        background: white;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        z-index: ${CONSTANTS.UI.OVERLAY_Z_INDEX + 1};
        transition: right 0.3s ease;
        display: flex;
        flex-direction: column;
      `;
      
      this.container.innerHTML = `
        <div class="notnot-sidebar-header" style="padding: 20px; border-bottom: 1px solid #e0e0e0;">
          <h2 style="margin: 0 0 10px 0; font-size: 20px;">NotNot</h2>
          <div class="notnot-video-info" style="font-size: 14px; color: #666;"></div>
          <button class="notnot-close-btn" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
        </div>
        <div class="notnot-sidebar-content" style="flex: 1; overflow-y: auto; padding: 20px;">
          <div class="notnot-captures-section">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">캡처된 이미지</h3>
            <div class="notnot-captures-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;"></div>
          </div>
          <div class="notnot-notes-section">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">노트</h3>
            <div class="notnot-editor" contenteditable="true" style="min-height: 200px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; font-size: 14px;"></div>
          </div>
        </div>
        <div class="notnot-sidebar-footer" style="padding: 20px; border-top: 1px solid #e0e0e0;">
          <button class="notnot-export-btn" style="width: 100%; padding: 10px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">PDF로 내보내기</button>
        </div>
      `;
      
      document.body.appendChild(this.container);
      
      // Cache DOM elements
      this.videoInfoEl = this.container.querySelector('.notnot-video-info');
      this.capturesGrid = this.container.querySelector('.notnot-captures-grid');
      this.editor = this.container.querySelector('.notnot-editor');
      
      this.attachEventListeners();
    }
    
    attachEventListeners() {
      const closeBtn = this.container.querySelector('.notnot-close-btn');
      const exportBtn = this.container.querySelector('.notnot-export-btn');
      
      eventManager.addEventListener(closeBtn, 'click', () => this.toggle());
      eventManager.addEventListener(exportBtn, 'click', () => this.exportToPDF());
      
      // Optimized auto-save with debounce
      const debouncedSave = utils.debounce(() => this.saveNote(), CONSTANTS.UI.DEBOUNCE_DELAY);
      eventManager.addEventListener(this.editor, 'input', debouncedSave);
      
      // Prevent keyboard shortcuts from propagating
      eventManager.addEventListener(this.editor, 'keydown', (e) => {
        if ((e.altKey && e.key.toLowerCase() === 's') || 
            (e.altKey && e.key.toLowerCase() === 'a')) {
          e.stopPropagation();
        }
      }, true);
    }
    
    async init() {
      this.create();
      await this.updateVideoInfo();
      await this.loadNote();
    }
    
    toggle() {
      if (!this.container) {
        this.init();
      }
      
      this.isVisible = !this.isVisible;
      this.container.style.right = this.isVisible ? '0' : `-${CONSTANTS.UI.SIDEBAR_WIDTH}`;
      
      if (this.isVisible) {
        this.updateVideoInfo();
        this.loadNote();
      }
    }
    
    async updateVideoInfo() {
      const title = utils.getVideoTitle();
      this.videoInfoEl.textContent = title;
    }
    
    async loadNote() {
      performanceMonitor.start('loadNote');
      
      try {
        const videoUrl = window.location.href;
        const existingNote = await this.storage.getNoteByVideoUrl(videoUrl);
        
        if (existingNote) {
          this.currentNote = existingNote;
          this.editor.innerHTML = existingNote.notes.content || '';
          
          const captures = await this.storage.getCapturesByNoteId(existingNote.id);
          this.displayCaptures(captures);
        } else {
          this.currentNote = {
            id: utils.generateId(),
            videoInfo: {
              url: videoUrl,
              title: utils.getVideoTitle(),
              platform: CONSTANTS.VIDEO_PLATFORMS.YOUTUBE
            },
            notes: { content: '' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.editor.innerHTML = '';
          this.capturesGrid.innerHTML = '';
        }
        
        performanceMonitor.end('loadNote');
      } catch (error) {
        logger.error('Failed to load note:', error);
        performanceMonitor.end('loadNote');
      }
    }
    
    async saveNote() {
      if (!this.currentNote) return;
      
      performanceMonitor.start('saveNote');
      
      try {
        this.currentNote.notes.content = this.editor.innerHTML;
        this.currentNote.updatedAt = new Date().toISOString();
        
        await this.storage.saveNote(this.currentNote);
        await this.saveRecentNotesToChromeStorage();
        
        logger.debug('Note saved');
        performanceMonitor.end('saveNote');
      } catch (error) {
        logger.error('Failed to save note:', error);
        performanceMonitor.end('saveNote');
      }
    }
    
    async saveRecentNotesToChromeStorage() {
      try {
        const allNotes = await this.storage.getAllNotes();
        const recentNotes = allNotes
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 5)
          .map(note => ({
            id: note.id,
            videoInfo: note.videoInfo,
            updatedAt: note.updatedAt,
            preview: this.getTextPreview(note.notes.content)
          }));
        
        chrome.storage.local.set({ 'notnot_recent_notes': recentNotes });
      } catch (error) {
        logger.error('Error saving recent notes:', error);
      }
    }
    
    getTextPreview(htmlContent, maxLength = 100) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    async exportToPDF() {
      performanceMonitor.start('exportToPDF');
      
      const printContent = document.createElement('div');
      printContent.innerHTML = `
        <style>
          @media print {
            body { margin: 0; font-family: Arial, sans-serif; }
            .print-header { margin-bottom: 20px; }
            .print-header h1 { font-size: 24px; margin: 0 0 10px 0; }
            .print-header p { margin: 5px 0; color: #666; }
            .print-captures { margin: 20px 0; }
            .print-capture { break-inside: avoid; margin-bottom: 20px; }
            .print-capture img { max-width: 100%; height: auto; }
            .print-capture .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
            .print-notes { margin-top: 30px; }
            .print-notes h2 { font-size: 20px; margin-bottom: 10px; }
          }
        </style>
        <div class="print-header">
          <h1>${this.currentNote.videoInfo.title}</h1>
          <p>URL: ${this.currentNote.videoInfo.url}</p>
          <p>날짜: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>
      `;
      
      const captures = await this.storage.getCapturesByNoteId(this.currentNote.id);
      if (captures.length > 0) {
        const capturesSection = document.createElement('div');
        capturesSection.className = 'print-captures';
        capturesSection.innerHTML = '<h2>캡처된 이미지</h2>';
        
        captures.forEach(capture => {
          const captureDiv = document.createElement('div');
          captureDiv.className = 'print-capture';
          captureDiv.innerHTML = `
            <img src="${capture.url}" alt="Capture">
            <div class="timestamp">타임스탬프: ${utils.formatTimestamp(capture.timestamp)}</div>
          `;
          capturesSection.appendChild(captureDiv);
        });
        
        printContent.appendChild(capturesSection);
      }
      
      const notesSection = document.createElement('div');
      notesSection.className = 'print-notes';
      notesSection.innerHTML = `
        <h2>노트</h2>
        <div>${this.currentNote.notes.content}</div>
      `;
      printContent.appendChild(notesSection);
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent.outerHTML);
      printWindow.document.close();
      printWindow.print();
      
      performanceMonitor.end('exportToPDF');
    }
    
    displayCaptures(captures) {
      this.capturesGrid.innerHTML = '';
      
      captures.forEach(capture => {
        const captureEl = document.createElement('div');
        captureEl.className = 'notnot-capture-item';
        captureEl.style.cssText = 'position: relative; cursor: pointer;';
        
        captureEl.innerHTML = `
          <img src="${capture.url}" style="width: 100%; border-radius: 4px;" alt="Capture">
          <div style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 2px; font-size: 12px;">
            ${utils.formatTimestamp(capture.timestamp)}
          </div>
        `;
        
        eventManager.addEventListener(captureEl, 'click', () => {
          this.insertCaptureToEditor(capture);
        });
        
        this.capturesGrid.appendChild(captureEl);
      });
    }
    
    insertCaptureToEditor(capture) {
      const imgHtml = `<img src="${capture.url}" style="max-width: 100%; margin: 10px 0;" data-timestamp="${capture.timestamp}">`;
      
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      const img = document.createElement('div');
      img.innerHTML = imgHtml;
      
      range.insertNode(img.firstChild);
      range.collapse(false);
      
      this.saveNote();
    }
    
    async addCapture(captureData) {
      if (!this.currentNote) {
        await this.loadNote();
      }
      
      captureData.noteId = this.currentNote.id;
      await this.storage.saveCapture(captureData);
      
      const captures = await this.storage.getCapturesByNoteId(this.currentNote.id);
      this.displayCaptures(captures);
      
      if (!this.isVisible) {
        this.toggle();
      }
      
      this.insertCaptureToEditor(captureData);
    }
  }

  // Storage Manager (Optimized)
  class StorageManager {
    constructor() {
      this.db = null;
      this.cache = new LRUCache(CONSTANTS.PERFORMANCE.CACHE_SIZE);
    }
    
    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('NotNotDB', 1);
        
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
      await this.promisifyRequest(store.put(note));
      
      // Update cache
      this.cache.set(`note_${note.videoInfo.url}`, note);
    }
    
    async getNoteByVideoUrl(url) {
      // Check cache first
      const cached = this.cache.get(`note_${url}`);
      if (cached) return cached;
      
      const transaction = this.db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const index = store.index('videoUrl');
      const request = index.get(url);
      
      const note = await this.promisifyRequest(request);
      if (note) {
        this.cache.set(`note_${url}`, note);
      }
      
      return note;
    }
    
    async saveCapture(capture) {
      const transaction = this.db.transaction(['captures'], 'readwrite');
      const store = transaction.objectStore('captures');
      await this.promisifyRequest(store.put(capture));
    }
    
    async getCapturesByNoteId(noteId) {
      const transaction = this.db.transaction(['captures'], 'readonly');
      const store = transaction.objectStore('captures');
      const index = store.index('noteId');
      const request = index.getAll(noteId);
      
      return this.promisifyRequest(request);
    }
    
    async getAllNotes() {
      const transaction = this.db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      return this.promisifyRequest(store.getAll());
    }
    
    promisifyRequest(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Overlay Injector (Optimized)
  class OverlayInjector {
    constructor() {
      this.overlay = null;
      this.injected = false;
    }
    
    async inject() {
      if (this.injected) return;
      
      performanceMonitor.start('injectOverlay');
      
      const checkInterval = setInterval(() => {
        const video = document.querySelector('video');
        const container = document.querySelector('#movie_player, .html5-video-player');
        
        if (video && container) {
          clearInterval(checkInterval);
          this.createOverlay(container);
          this.injected = true;
          performanceMonitor.end('injectOverlay');
        }
      }, 1000);
      
      // Cleanup interval after 30 seconds
      setTimeout(() => clearInterval(checkInterval), 30000);
    }
    
    createOverlay(container) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'notnot-overlay';
      this.overlay.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: ${CONSTANTS.UI.OVERLAY_Z_INDEX};
        display: flex;
        gap: 8px;
      `;
      
      const captureBtn = this.createButton('📷', 'Capture (Alt+S)', () => {
        window.dispatchEvent(new CustomEvent('notnot-capture'));
      });
      
      const noteBtn = this.createButton('📝', 'Notes (Alt+N)', () => {
        window.dispatchEvent(new CustomEvent('notnot-toggle-sidebar'));
      });
      
      this.overlay.appendChild(captureBtn);
      this.overlay.appendChild(noteBtn);
      
      container.appendChild(this.overlay);
      
      // Handle fullscreen changes
      const handleFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        this.overlay.style.display = isFullscreen ? 'none' : 'flex';
      };
      
      eventManager.addEventListener(document, 'fullscreenchange', handleFullscreenChange);
    }
    
    createButton(text, title, onClick) {
      const button = document.createElement('button');
      button.className = 'notnot-overlay-button';
      button.textContent = text;
      button.title = title;
      button.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.2s;
      `;
      
      eventManager.addEventListener(button, 'mouseenter', () => {
        button.style.background = 'rgba(0, 0, 0, 0.9)';
      });
      
      eventManager.addEventListener(button, 'mouseleave', () => {
        button.style.background = 'rgba(0, 0, 0, 0.7)';
      });
      
      eventManager.addEventListener(button, 'click', onClick);
      
      return button;
    }
  }

  // Video Detector (Optimized)
  class VideoDetector {
    constructor() {
      this.video = null;
      this.observer = null;
      this.storageManager = null;
      this.sidebarUI = null;
      this.captureHandler = null;
      this.overlayInjector = null;
      this.isInitialized = false;
    }
    
    async init() {
      if (this.isInitialized) return;
      
      performanceMonitor.start('init');
      
      this.storageManager = new StorageManager();
      await this.storageManager.init();
      
      this.detectVideo();
      this.setupKeyboardShortcuts();
      this.setupMessageListeners();
      
      this.isInitialized = true;
      
      performanceMonitor.end('init');
    }
    
    detectVideo() {
      const findVideo = () => {
        this.video = document.querySelector('video');
        if (this.video) {
          logger.log('Video detected');
          this.initializeComponents();
          return true;
        }
        return false;
      };
      
      if (!findVideo()) {
        this.observer = new MutationObserver(utils.throttle((mutations) => {
          if (findVideo()) {
            this.observer.disconnect();
          }
        }, 1000));
        
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }
    
    async initializeComponents() {
      this.captureHandler = new CaptureHandler(this.video, this.storageManager);
      this.sidebarUI = new SidebarUI(this.storageManager);
      this.overlayInjector = new OverlayInjector();
      
      await this.sidebarUI.init();
      await this.overlayInjector.inject();
      
      this.setupVideoEventListeners();
    }
    
    setupVideoEventListeners() {
      eventManager.addEventListener(window, 'notnot-capture', () => {
        this.handleCapture();
      });
      
      eventManager.addEventListener(window, 'notnot-toggle-sidebar', () => {
        if (this.sidebarUI) {
          this.sidebarUI.toggle();
        }
      });
    }
    
    setupKeyboardShortcuts() {
      const handleKeydown = (e) => {
        // Skip if user is typing in an input field (except our editor)
        const isInEditor = e.target.closest('.notnot-editor');
        const isInInput = e.target.matches('input, textarea, [contenteditable="true"]');
        
        if (isInInput && !isInEditor) return;
        
        // Alt+S: Capture
        if (e.altKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          e.stopPropagation();
          
          if (e.shiftKey) {
            this.performCapture('area');
          } else {
            this.performCapture('fullframe');
          }
        }
        
        // Alt+N: Toggle sidebar
        if (e.altKey && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('notnot-toggle-sidebar'));
        }
      };
      
      // Capture at multiple levels for reliability
      eventManager.addEventListener(document, 'keydown', handleKeydown, true);
      eventManager.addEventListener(window, 'keydown', handleKeydown, true);
    }
    
    setupMessageListeners() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        logger.debug('Message received:', request);
        
        switch (request.action) {
          case 'ping':
            sendResponse({ status: 'ready' });
            break;
            
          case 'capture':
            this.handleCapture().then(() => {
              sendResponse({ success: true });
            }).catch((error) => {
              logger.error('Capture error:', error);
              sendResponse({ success: false, error: error.message });
            });
            return true;
            
          case 'toggleSidebar':
            if (this.sidebarUI) {
              this.sidebarUI.toggle();
            }
            sendResponse({ success: true });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      });
    }
    
    async handleCapture() {
      if (!this.video || !this.captureHandler) {
        logger.warn('Video or capture handler not ready');
        return;
      }
      
      try {
        const captureData = await this.captureHandler.captureArea();
        if (captureData && this.sidebarUI) {
          await this.sidebarUI.addCapture(captureData);
          logger.log('Capture completed');
        }
      } catch (error) {
        logger.error('Capture failed:', error);
      }
    }
    
    async performCapture(type) {
      if (!this.video || !this.captureHandler) {
        if (!this.sidebarUI) {
          await this.initializeComponents();
        }
        
        if (this.sidebarUI && !this.sidebarUI.isVisible) {
          this.sidebarUI.toggle();
        }
        
        setTimeout(() => this.performCapture(type), 100);
        return;
      }
      
      try {
        let captureData;
        
        if (type === 'area') {
          captureData = await this.captureHandler.captureArea();
        } else {
          captureData = await this.captureHandler.captureFullFrame();
        }
        
        if (captureData && this.sidebarUI) {
          await this.sidebarUI.addCapture(captureData);
        }
      } catch (error) {
        logger.error('Capture failed:', error);
      }
    }
  }

  // Initialize
  const detector = new VideoDetector();
  detector.init().catch(error => {
    logger.error('Initialization failed:', error);
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    eventManager.cleanup();
  });

})();