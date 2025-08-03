// NotNot Content Script - YouTube Focus Version
(function() {
  if (window.notnotContentScriptLoaded) {
    console.log('NotNot: Content script already loaded, skipping...');
    return;
  }
  window.notnotContentScriptLoaded = true;
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
    SIDEBAR_WIDTH: '500px',
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
    // Create overlay
    this.overlay = document.createElement('div');
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
    
    // Create selection box
    this.selection = document.createElement('div');
    this.selection.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255, 255, 255, 0.1);
      display: none;
    `;
    
    this.overlay.appendChild(this.selection);
    document.body.appendChild(this.overlay);
    
    // Add event listeners
    this.overlay.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.overlay.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.overlay.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
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
    this.updateSelection(e.clientX, e.clientY);
  }
  
  handleMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    
    const rect = this.selection.getBoundingClientRect();
    const videoRect = this.video.getBoundingClientRect();
    
    // Calculate selection relative to video
    const selection = {
      x: Math.max(0, rect.left - videoRect.left),
      y: Math.max(0, rect.top - videoRect.top),
      width: Math.min(rect.width, videoRect.width),
      height: Math.min(rect.height, videoRect.height)
    };
    
    // Scale to actual video dimensions
    const scaleX = this.video.videoWidth / videoRect.width;
    const scaleY = this.video.videoHeight / videoRect.height;
    
    const scaledSelection = {
      x: selection.x * scaleX,
      y: selection.y * scaleY,
      width: selection.width * scaleX,
      height: selection.height * scaleY
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
  }
  
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
    }
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}

// Capture Handler
class CaptureHandler {
  constructor(videoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async captureFrame(selection = null) {
    console.log('NotNot: Capturing frame');
    console.log('Video element:', this.video);
    console.log('Video paused:', this.video.paused);
    console.log('Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
    console.log('Video current time:', this.video.currentTime);
    
    if (!this.video.videoWidth || !this.video.videoHeight) {
      console.error('NotNot: Video dimensions not available');
      throw new Error('Video not ready for capture');
    }
    
    // Set canvas dimensions based on selection or full video
    if (selection) {
      this.canvas.width = selection.width;
      this.canvas.height = selection.height;
      console.log('NotNot: Canvas dimensions set to selection:', this.canvas.width, 'x', this.canvas.height);
    } else {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      console.log('NotNot: Canvas dimensions set to full video:', this.canvas.width, 'x', this.canvas.height);
    }
    
    try {
      // Draw the selected area or full video
      if (selection) {
        this.ctx.drawImage(
          this.video,
          selection.x, selection.y, selection.width, selection.height,  // Source
          0, 0, this.canvas.width, this.canvas.height                 // Destination
        );
      } else {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      }
      const imageData = this.canvas.toDataURL('image/jpeg', CONSTANTS.UI.CAPTURE_QUALITY);
      
      console.log('NotNot: Canvas toDataURL result length:', imageData.length);
      console.log('NotNot: First 50 chars of imageData:', imageData.substring(0, 50));
      
      if (!imageData || imageData === 'data:,' || imageData.length < 100) {
        throw new Error('Failed to capture video frame - invalid image data');
      }
      
      // Capture successful, no need for test window anymore

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

      console.log('NotNot: Frame captured successfully', {
        id: capture.id,
        timestamp: capture.timestamp,
        imageSize: imageData.length,
        videoTitle: capture.videoTitle
      });
      
      return capture;
    } catch (error) {
      console.error('NotNot: Error capturing frame', error);
      console.error('NotNot: Error stack:', error.stack);
      
      // Try alternative capture method
      console.log('NotNot: Trying alternative capture method...');
      try {
        // Create a new canvas with specific settings
        const altCanvas = document.createElement('canvas');
        altCanvas.width = this.video.videoWidth;
        altCanvas.height = this.video.videoHeight;
        const altCtx = altCanvas.getContext('2d', {
          alpha: false,
          desynchronized: true,
          willReadFrequently: true
        });
        
        altCtx.drawImage(this.video, 0, 0);
        const altImageData = altCanvas.toDataURL('image/jpeg', 0.92);
        
        if (altImageData && altImageData.length > 100) {
          console.log('NotNot: Alternative capture successful');
          const capture = {
            id: utils.generateId(),
            timestamp: this.video.currentTime,
            imageData: altImageData,
            videoUrl: window.location.href,
            videoTitle: utils.getVideoTitle(),
            createdAt: new Date().toISOString(),
            annotations: [],
            extractedText: ''
          };
          return capture;
        }
      } catch (altError) {
        console.error('NotNot: Alternative capture also failed', altError);
      }
      
      throw error;
    }
  }
}

// Sidebar UI Component
class SidebarUI {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.currentNote = null;
    this.storage = new StorageManager();
    this.lastCaptureArea = null; // Store last capture area
    this.captureShortcut = 'Alt+S'; // Default shortcut
    this.rememberCaptureArea = true; // Default setting
    this.lastCursorPosition = null; // Store last cursor position in editor
    this.loadSettings();
  }
  
  async loadSettings() {
    // Load settings from Chrome storage
    chrome.storage.sync.get('notnot_settings', (result) => {
      if (result.notnot_settings) {
        this.captureShortcut = result.notnot_settings.captureShortcut || 'Alt+S';
        this.rememberCaptureArea = result.notnot_settings.rememberCaptureArea !== false;
        
        // Update shortcut display if sidebar is visible
        const shortcutInfo = document.getElementById('notnot-shortcut-info');
        if (shortcutInfo) {
          shortcutInfo.textContent = `캡처 단축키: ${this.captureShortcut}`;
        }
        
        // Clear last capture area if remember setting is off
        if (!this.rememberCaptureArea) {
          this.lastCaptureArea = null;
        }
      }
    });
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.notnot_settings) {
        const newSettings = changes.notnot_settings.newValue;
        if (newSettings) {
          this.captureShortcut = newSettings.captureShortcut || 'Alt+S';
          this.rememberCaptureArea = newSettings.rememberCaptureArea !== false;
          
          // Update UI
          const shortcutInfo = document.getElementById('notnot-shortcut-info');
          if (shortcutInfo) {
            shortcutInfo.textContent = `캡처 단축키: ${this.captureShortcut}`;
          }
          
          // Clear last capture area if remember setting is off
          if (!this.rememberCaptureArea) {
            this.lastCaptureArea = null;
          }
        }
      }
    });
  }

  async init() {
    console.log('NotNot: Initializing sidebar...');
    await this.storage.init();
    console.log('NotNot: Storage initialized');
    this.createSidebar();
    console.log('NotNot: Sidebar created');
  }

  createSidebar() {
    console.log('NotNot: Creating sidebar UI');
    
    // Check if sidebar already exists
    const existingSidebar = document.getElementById('notnot-sidebar');
    if (existingSidebar) {
      console.log('NotNot: Sidebar already exists, removing old one');
      existingSidebar.remove();
    }
    
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
      z-index: 2147483647;
      transition: right 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Create header with improved title styling
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
    `;
    header.innerHTML = `
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
    `;

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 12px 20px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      gap: 8px;
      align-items: center;
    `;
    toolbar.innerHTML = `
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
      <div style="width: 1px; height: 20px; background: #e5e7eb; margin: 0 4px;"></div>
      <select id="notnot-font-select" style="padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px; background: white;">
        <option value="">Default Font</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="'Courier New'">Courier New</option>
        <option value="'Times New Roman'">Times New Roman</option>
      </select>
    `;

    // Create action buttons
    const actions = document.createElement('div');
    actions.style.cssText = `
      padding: 12px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    `;
    actions.innerHTML = `
      <button id="notnot-recent-notes" style="flex: 1; padding: 8px 12px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        최근 노트 이어서 쓰기
      </button>
      <button id="notnot-import-pdf" style="flex: 1; padding: 8px 12px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        PDF 불러오기
      </button>
    `;

    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;

    // Create editor with placeholder
    const editor = document.createElement('div');
    editor.id = 'notnot-note-editor';
    editor.contentEditable = 'true';
    editor.style.cssText = `
      min-height: 200px;
      outline: none;
      font-size: 15px;
      line-height: 1.6;
      color: #111827;
    `;
    editor.setAttribute('data-placeholder', '이곳을 클릭해 노트를 작성하세요. "/"키를 누르면 텍스트 스타일, 표, 이미지 등을 추가할 수 있어요.');
    
    content.appendChild(editor);

    // Hidden file input for PDF import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'notnot-file-input';

    // Assemble sidebar
    this.container.appendChild(header);
    this.container.appendChild(toolbar);
    this.container.appendChild(actions);
    this.container.appendChild(content);
    this.container.appendChild(fileInput);

    // Add to page
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    const editor = document.getElementById('notnot-note-editor');
    
    // Note saving
    editor.addEventListener('input', utils.debounce(() => {
      this.saveNote();
      // Remove placeholder when content exists
      if (editor.textContent.trim() !== '') {
        editor.classList.add('has-content');
      } else {
        editor.classList.remove('has-content');
      }
    }, 1000));
    
    // Prevent YouTube keyboard shortcuts from triggering when typing in notes
    const stopYouTubeShortcuts = (e) => {
      // Always stop propagation first
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Prevent default for all keys when editor is focused
      const key = e.key.toLowerCase();
      const youtubeShortcuts = ['f', 'k', 'j', 'l', 'm', 'c', 't', 'i', 'o', 'p', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      const isModifierKey = e.ctrlKey || e.metaKey || e.altKey;
      
      // Allow Ctrl+B, Ctrl+I, Ctrl+U for formatting
      if (isModifierKey && ['b', 'i', 'u'].includes(key)) {
        return;
      }
      
      if (youtubeShortcuts.includes(key) || (e.key >= '0' && e.key <= '9')) {
        e.preventDefault();
      }
    };
    
    // Add event listeners for all keyboard events with highest priority
    console.log('NotNot: Adding keydown listener to editor', editor);
    
    // Test if editor exists and is contenteditable
    console.log('NotNot: Editor contentEditable:', editor.contentEditable);
    console.log('NotNot: Editor id:', editor.id);
    
    const keydownHandler = (e) => {
      console.log('NotNot Editor: keydown event fired! Key:', e.key);
      
      // Debug: Log key combinations with modifiers
      if (e.altKey || e.ctrlKey) {
        console.log('NotNot Editor: Key pressed:', e.key, 'Alt:', e.altKey, 'Ctrl:', e.ctrlKey, 'Shift:', e.shiftKey);
        console.log('NotNot Editor: this object:', this);
        console.log('NotNot Editor: captureShortcut setting:', this.captureShortcut);
      }
      
      // Check for capture shortcut FIRST before stopping propagation
      const isCaptureShortcut = this.checkCaptureShortcut(e);
      if (e.altKey || e.ctrlKey) {
        console.log('NotNot Editor: Is capture shortcut?', isCaptureShortcut);
      }
      
      if (isCaptureShortcut) {
        console.log('NotNot: Capture shortcut detected in editor!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Find the overlay injector and trigger capture
        if (window.videoDetector && window.videoDetector.overlayInjector) {
          console.log('NotNot: Triggering capture from editor');
          window.videoDetector.overlayInjector.handleCapture();
        } else {
          console.log('NotNot: No videoDetector available in editor');
          console.log('NotNot: window.videoDetector:', window.videoDetector);
          // Fallback: dispatch a custom event that global handler can catch
          const captureEvent = new CustomEvent('notnot-capture-requested');
          document.dispatchEvent(captureEvent);
        }
        return;
      }
      
      // ALWAYS stop propagation for other keys
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Handle special keys
      if (e.key === '/' && editor.textContent.trim() === '') {
        e.preventDefault();
        this.showSlashCommands();
        return;
      }
      
      // Stop YouTube shortcuts
      stopYouTubeShortcuts(e);
    };
    
    // Add a simple test listener first
    editor.addEventListener('click', () => {
      console.log('NotNot: Editor clicked! Testing event listeners work');
    });
    
    // Try multiple approaches to ensure event handler works
    editor.addEventListener('keydown', keydownHandler, true);
    editor.addEventListener('keydown', keydownHandler, false);
    console.log('NotNot: Keydown listeners added successfully');
    
    // Also add to parent container
    const notesContent = editor.parentElement;
    if (notesContent) {
      notesContent.addEventListener('keydown', (e) => {
        if (e.target === editor || editor.contains(e.target)) {
          console.log('NotNot: Parent caught keydown - Key:', e.key);
          keydownHandler.call(this, e);
        }
      }, true);
    }
    
    editor.addEventListener('keyup', stopYouTubeShortcuts, true);
    editor.addEventListener('keypress', stopYouTubeShortcuts, true);
    
    // Save cursor position when editor loses focus
    editor.addEventListener('blur', () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        this.lastCursorPosition = selection.getRangeAt(0).cloneRange();
        console.log('NotNot: Saved cursor position on blur');
      }
    });
    
    // Reset saved cursor position when editor gains focus
    editor.addEventListener('focus', () => {
      this.lastCursorPosition = null;
      console.log('NotNot: Reset cursor position on focus');
      console.log('NotNot: Editor has focus, capture shortcut is:', this.captureShortcut);
    });
    
    // Also block at document level when editor is focused
    const blockAtDocument = (e) => {
      if (document.activeElement === editor || editor.contains(document.activeElement)) {
        stopYouTubeShortcuts(e);
      }
    };
    
    // Use capture phase at document level to intercept before YouTube
    document.addEventListener('keydown', blockAtDocument, true);
    document.addEventListener('keyup', blockAtDocument, true);
    document.addEventListener('keypress', blockAtDocument, true);
    
    // Store references for cleanup
    this.documentListeners = {
      keydown: blockAtDocument,
      keyup: blockAtDocument,
      keypress: blockAtDocument
    };
    
    // Toolbar buttons
    this.container.querySelectorAll('.notnot-toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        editor.focus();
      });
    });
    
    // Font selection
    const fontSelect = document.getElementById('notnot-font-select');
    fontSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        document.execCommand('fontName', false, e.target.value);
      }
      editor.focus();
    });
    
    // Close button - remove old listener first
    const closeBtn = document.getElementById('notnot-close-btn');
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', () => {
      console.log('NotNot: Close button clicked');
      this.toggle();
    });
    
    // Export PDF button
    const exportBtn = document.getElementById('notnot-export-pdf');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        console.log('NotNot: Export PDF clicked');
        this.exportToPDF();
      });
    }
    
    // Recent notes button
    document.getElementById('notnot-recent-notes').addEventListener('click', () => {
      this.showRecentNotes();
    });
    
    // PDF import button
    document.getElementById('notnot-import-pdf').addEventListener('click', () => {
      document.getElementById('notnot-file-input').click();
    });
    
    // File input change
    document.getElementById('notnot-file-input').addEventListener('change', (e) => {
      this.handlePDFImport(e.target.files[0]);
    });
    
    // Add shortcut info to header
    const shortcutInfo = document.createElement('div');
    shortcutInfo.id = 'notnot-shortcut-info';
    shortcutInfo.style.cssText = `
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    `;
    shortcutInfo.textContent = `캡처 단축키: ${this.captureShortcut}`;
    const header = this.container.querySelector('h1');
    if (header) {
      header.parentElement.appendChild(shortcutInfo);
    }
  }
  
  checkCaptureShortcut(e) {
    // Ensure captureShortcut exists
    if (!this.captureShortcut) {
      return false;
    }
    
    // Parse the shortcut setting
    const parts = this.captureShortcut.toLowerCase().split('+');
    let altRequired = false;
    let ctrlRequired = false;
    let shiftRequired = false;
    let key = '';
    
    parts.forEach(part => {
      part = part.trim();
      if (part === 'alt') altRequired = true;
      else if (part === 'ctrl') ctrlRequired = true;
      else if (part === 'shift') shiftRequired = true;
      else key = part;
    });
    
    return (
      e.altKey === altRequired &&
      e.ctrlKey === ctrlRequired &&
      e.shiftKey === shiftRequired &&
      e.key.toLowerCase() === key
    );
  }

  showSlashCommands() {
    // Create slash command menu
    const menu = document.createElement('div');
    menu.id = 'notnot-slash-menu';
    menu.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 8px;
      z-index: 10;
      min-width: 200px;
    `;
    
    const commands = [
      { name: 'heading', icon: 'H', label: '제목' },
      { name: 'bold', icon: 'B', label: '굵게' },
      { name: 'italic', icon: 'I', label: '기울임' },
      { name: 'underline', icon: 'U', label: '밑줄' },
      { name: 'bullet', icon: '•', label: '글머리 기호' },
      { name: 'image', icon: '🖼', label: '이미지' },
      { name: 'table', icon: '⊞', label: '표' }
    ];
    
    commands.forEach(cmd => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 4px;
        font-size: 14px;
      `;
      item.innerHTML = `
        <span style="width: 20px; text-align: center; font-weight: 600;">${cmd.icon}</span>
        <span>${cmd.label}</span>
      `;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f3f4f6';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'none';
      });
      item.addEventListener('click', () => {
        this.executeSlashCommand(cmd.name);
        menu.remove();
      });
      menu.appendChild(item);
    });
    
    // Position menu
    const editor = document.getElementById('notnot-note-editor');
    const rect = editor.getBoundingClientRect();
    menu.style.top = '60px';
    menu.style.left = '20px';
    
    editor.parentElement.appendChild(menu);
    
    // Remove menu on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
  
  executeSlashCommand(command) {
    const editor = document.getElementById('notnot-note-editor');
    
    switch(command) {
      case 'heading':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'image':
        const url = prompt('이미지 URL을 입력하세요:');
        if (url) {
          document.execCommand('insertImage', false, url);
        }
        break;
      case 'table':
        const table = '<table border="1" style="border-collapse: collapse; margin: 10px 0;"><tr><td style="padding: 8px;">셀 1</td><td style="padding: 8px;">셀 2</td></tr><tr><td style="padding: 8px;">셀 3</td><td style="padding: 8px;">셀 4</td></tr></table>';
        document.execCommand('insertHTML', false, table);
        break;
    }
    
    editor.focus();
  }
  
  async showRecentNotes() {
    const notes = await this.storage.getAllNotes();
    const recentNotes = notes
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 5);
    
    if (recentNotes.length === 0) {
      alert('최근 노트가 없습니다.');
      return;
    }
    
    // Create dropdown menu
    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 8px;
      z-index: 10;
      max-width: 350px;
      top: 140px;
      left: 20px;
      right: 20px;
    `;
    
    recentNotes.forEach(note => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 12px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 4px;
      `;
      item.innerHTML = `
        <div style="font-weight: 500; margin-bottom: 4px;">${note.videoInfo.title}</div>
        <div style="font-size: 12px; color: #6b7280;">${new Date(note.updatedAt || note.createdAt).toLocaleString('ko-KR')}</div>
      `;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f3f4f6';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'none';
      });
      item.addEventListener('click', async () => {
        // Append note content to current editor
        const editor = document.getElementById('notnot-note-editor');
        if (editor.textContent.trim() !== '') {
          editor.innerHTML += '<br><br>';
        }
        editor.innerHTML += `<div style="margin: 20px 0; padding: 16px; background: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">이전 노트 (${note.videoInfo.title})</div>
          ${note.notes.content}
        </div>`;
        this.saveNote();
        menu.remove();
      });
      menu.appendChild(item);
    });
    
    this.container.appendChild(menu);
    
    // Remove menu on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && !document.getElementById('notnot-recent-notes').contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
  
  handlePDFImport(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('PDF 파일을 선택해주세요.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const editor = document.getElementById('notnot-note-editor');
      editor.innerHTML += `
        <div style="margin: 20px 0; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span style="font-weight: 600;">${file.name}</span>
          </div>
          <embed src="${e.target.result}" type="application/pdf" width="100%" height="600px" />
        </div>
      `;
      this.saveNote();
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    document.getElementById('notnot-file-input').value = '';
  }

  toggle() {
    console.log('NotNot: Toggling sidebar');
    
    // Check if container exists
    if (!this.container) {
      console.error('NotNot: Sidebar container does not exist!');
      return;
    }
    
    // Check if sidebar DOM elements exist
    const videoTitle = document.getElementById('notnot-video-title');
    const noteEditor = document.getElementById('notnot-note-editor');
    if (!videoTitle || !noteEditor) {
      console.error('NotNot: Sidebar DOM elements missing! Recreating sidebar...');
      this.createSidebar();
    }
    
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      console.log('NotNot: Showing sidebar');
      this.container.style.right = '0';
      this.updateVideoInfo();
      this.loadNote();
    } else {
      console.log('NotNot: Hiding sidebar');
      this.container.style.right = `-${CONSTANTS.UI.SIDEBAR_WIDTH}`;
    }
  }
  
  destroy() {
    console.log('NotNot: Destroying sidebar');
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.documentListeners) {
      document.removeEventListener('keydown', this.documentListeners.keydown, true);
      document.removeEventListener('keyup', this.documentListeners.keyup, true);
      document.removeEventListener('keypress', this.documentListeners.keypress, true);
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
    console.log('NotNot: Loading note', this.currentNote);
    if (this.currentNote) {
      const editor = document.getElementById('notnot-note-editor');
      editor.innerHTML = this.currentNote.notes.content || '';
      
      // Update has-content class
      if (editor.textContent.trim() !== '') {
        editor.classList.add('has-content');
      } else {
        editor.classList.remove('has-content');
      }
    }
  }

  async saveNote() {
    if (!this.currentNote) return;
    
    const editor = document.getElementById('notnot-note-editor');
    this.currentNote.notes.content = editor.innerHTML;
    await this.storage.saveNote(this.currentNote);
    
    // Also save to Chrome storage for recent notes in popup
    await this.saveRecentNotesToChromeStorage();
  }
  
  async saveRecentNotesToChromeStorage() {
    try {
      // Get all notes from IndexedDB
      const allNotes = await this.storage.getAllNotes();
      
      // Sort by updated date and get recent 5
      const recentNotes = allNotes
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(note => ({
          id: note.id,
          videoInfo: note.videoInfo,
          updatedAt: note.updatedAt,
          preview: this.getTextPreview(note.notes.content)
        }));
      
      // Save to Chrome storage
      chrome.storage.local.set({ 'notnot_recent_notes': recentNotes });
    } catch (error) {
      console.error('NotNot: Error saving recent notes:', error);
    }
  }
  
  getTextPreview(htmlContent) {
    // Strip HTML tags and get first 100 characters
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim().substring(0, 100) + (text.length > 100 ? '...' : '');
  }
  
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('notnot_settings', (result) => {
        const defaultSettings = {
          exportFormat: 'pdf',
          includeTimestamps: true
        };
        resolve({ ...defaultSettings, ...(result.notnot_settings || {}) });
      });
    });
  }
  
  async exportToPDF() {
    if (!this.currentNote) {
      alert('No note to export!');
      return;
    }
    
    console.log('NotNot: Exporting to PDF...');
    
    // Get user settings
    const settings = await this.getSettings();
    
    // Create a new window with the content formatted for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    
    // Generate HTML content for PDF
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
          .note-content p {
            margin-bottom: 15px;
          }
          .note-content img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .timestamp {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            color: #4b5563;
          }
          @media print {
            body {
              padding: 20px;
            }
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
    
    // Wait for images to load before printing
    printWindow.onload = function() {
      printWindow.print();
      // Close the window after printing
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };
  }

  async addCapture(captureData) {
    console.log('NotNot: Adding capture', captureData);
    console.log('NotNot: Current note before:', this.currentNote);
    
    // Ensure we have a current note
    if (!this.currentNote) {
      console.log('NotNot: No current note, creating one...');
      await this.updateVideoInfo();
    }
    
    console.log('NotNot: Current note after:', this.currentNote);
    
    if (!this.currentNote) {
      console.error('NotNot: Failed to create note');
      return;
    }
    
    captureData.noteId = this.currentNote.id;
    console.log('NotNot: Capture data with noteId:', captureData);
    
    try {
      await this.storage.saveCapture(captureData);
      console.log('NotNot: Capture saved to IndexedDB successfully');
      
      // Verify it was saved
      const savedCaptures = await this.storage.getCapturesByNoteId(this.currentNote.id);
      console.log('NotNot: Total captures for this note:', savedCaptures.length);
      
      // Insert capture directly into the editor
      const editor = document.getElementById('notnot-note-editor');
      if (editor) {
        const timestamp = utils.formatTimestamp(captureData.timestamp);
        
        // Create image HTML
        const imageHtml = `<div style="margin: 16px 0;">
          <img src="${captureData.imageData}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" alt="Screenshot at ${timestamp}">
          <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #6b7280;">캡처 시간: ${timestamp}</div>
        </div><p><br></p>`;
        
        // Focus the editor first
        editor.focus();
        
        // Check if we have a saved cursor position
        if (this.lastCursorPosition) {
          console.log('NotNot: Using saved cursor position for image insertion');
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(this.lastCursorPosition);
          // Clear the saved position after use
          this.lastCursorPosition = null;
        }
        
        // Use execCommand to insert at cursor position
        document.execCommand('insertHTML', false, imageHtml);
        
        // Move cursor to the end
        const selection = window.getSelection();
        const range = document.createRange();
        
        // Find the last <p> element we just added
        const lastP = editor.querySelector('p:last-child');
        if (lastP) {
          range.selectNodeContents(lastP);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        this.saveNote();
        
        // Add has-content class
        editor.classList.add('has-content');
      }
    } catch (error) {
      console.error('NotNot: Error saving capture', error);
      console.error('NotNot: Error stack:', error.stack);
    }
  }

  // Removed displayCapture method as captures are now directly inserted into notes
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
  
  async getAllNotes() {
    const transaction = this.db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
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
    // Check if overlay already exists
    const existingOverlay = document.querySelector('.notnot-overlay');
    if (existingOverlay) {
      console.log('NotNot: Overlay already exists, removing old one');
      existingOverlay.remove();
    }
    
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
    let longPressTimer;
    
    // Normal click - use saved area
    captureBtn.addEventListener('click', (e) => {
      if (!longPressTimer) {
        this.handleCapture();
      }
    });
    
    // Long press - reset capture area
    captureBtn.addEventListener('mousedown', () => {
      longPressTimer = setTimeout(() => {
        console.log('NotNot: Long press detected, resetting capture area');
        this.sidebar.lastCaptureArea = null;
        this.showToast('캡처 영역이 초기화되었습니다. 새 영역을 선택하세요.');
        longPressTimer = null;
      }, 1000); // 1 second long press
    });
    
    captureBtn.addEventListener('mouseup', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    
    captureBtn.addEventListener('mouseleave', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });

    // Toggle notes button
    const toggleBtn = this.overlay.querySelector('.notnot-toggle-notes');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // Update timestamp on video time update
    this.video.addEventListener('timeupdate', () => this.updateTimestamp());
  }

  async handleCapture() {
    console.log('NotNot: Handle capture clicked');
    console.log('NotNot: Video element:', this.video);
    console.log('NotNot: Sidebar visibility:', this.sidebar.isVisible);
    
    // If we have a saved capture area and remember setting is on, use it directly
    if (this.sidebar.lastCaptureArea && this.sidebar.rememberCaptureArea) {
      console.log('NotNot: Using saved capture area:', this.sidebar.lastCaptureArea);
      await this.performCapture(this.sidebar.lastCaptureArea);
    } else {
      // First time or remember is off - show area selector
      const selector = new AreaSelector(this.video, async (selection, cancelled) => {
        if (cancelled) {
          console.log('NotNot: Capture cancelled');
          return;
        }
        
        // Save the selection for future use if remember is on
        if (this.sidebar.rememberCaptureArea) {
          this.sidebar.lastCaptureArea = selection;
        }
        await this.performCapture(selection);
      });
      
      selector.start();
    }
  }
  
  async performCapture(selection) {
    try {
      const captureHandler = new CaptureHandler(this.video);
      const capture = await captureHandler.captureFrame(selection);
      
      console.log('NotNot: Capture created:', capture);
      
      // Show sidebar first if hidden to ensure note is created
      if (!this.sidebar.isVisible) {
        console.log('NotNot: Sidebar not visible, toggling...');
        this.sidebar.toggle();
        // Wait a bit for sidebar initialization
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await this.sidebar.addCapture(capture);
      console.log('NotNot: Capture handled successfully');
      
      // Show a visual feedback
      const captureBtn = this.overlay.querySelector('.notnot-capture');
      if (captureBtn) {
        captureBtn.style.background = '#10b981';
        setTimeout(() => {
          captureBtn.style.background = '';
        }, 300);
      }
      
      // Show toast notification for keyboard capture
      if (!document.querySelector('.notnot-toast')) {
        this.showToast('스크린샷 캡처됨!');
      }
    } catch (error) {
      console.error('NotNot: Error handling capture', error);
      alert('Failed to capture screenshot: ' + error.message);
    }
  }
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'notnot-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2147483647;
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
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
  
  destroy() {
    console.log('NotNot: Destroying overlay injector');
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.sidebar) {
      this.sidebar.destroy();
      this.sidebar = null;
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
    console.log('NotNot: Destroying video detector');
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.overlayInjector) {
      this.overlayInjector.destroy();
      this.overlayInjector = null;
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
    if (videoDetector && videoDetector.overlayInjector && videoDetector.overlayInjector.sidebar) {
      // Check if sidebar is already visible
      const sidebar = videoDetector.overlayInjector.sidebar;
      if (sidebar.container && document.body.contains(sidebar.container)) {
        console.log('NotNot: Toggling existing sidebar');
        videoDetector.overlayInjector.toggleSidebar();
        sendResponse({success: true});
      } else {
        console.log('NotNot: Sidebar container missing, reinitializing...');
        videoDetector.overlayInjector.sidebar.createSidebar();
        setTimeout(() => {
          videoDetector.overlayInjector.toggleSidebar();
          sendResponse({success: true});
        }, 100);
      }
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
window.videoDetector = null; // Make it globally accessible

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
      window.videoDetector = videoDetector;
      videoDetector.init();
    }, 1000);
  }
}).observe(document, {subtree: true, childList: true});

// Initial load
console.log('NotNot: Starting initial video detection');
videoDetector = new VideoDetector();
window.videoDetector = videoDetector;
videoDetector.init();

// Global capture shortcut handler - set up immediately
console.log('NotNot: Setting up global capture shortcut handler immediately');

// Handler for custom capture event from editor
document.addEventListener('notnot-capture-requested', () => {
  console.log('NotNot: Custom capture event received');
  if (window.videoDetector && window.videoDetector.overlayInjector) {
    window.videoDetector.overlayInjector.handleCapture();
  }
});

document.addEventListener('keydown', async (e) => {
  // Only check if Alt key is pressed (for Alt+S)
  if (!e.altKey && !e.ctrlKey) return;
  
  // Debug log
  if (e.altKey && e.key.toLowerCase() === 's') {
    console.log('NotNot Global: Alt+S detected!');
    console.log('NotNot Global: videoDetector exists?', !!window.videoDetector);
    console.log('NotNot Global: overlayInjector exists?', !!window.videoDetector?.overlayInjector);
    console.log('NotNot Global: sidebar exists?', !!window.videoDetector?.overlayInjector?.sidebar);
  }
  
  // Don't trigger if typing in a regular input field (but allow our editor)
  const activeElement = document.activeElement;
  const isInOurEditor = activeElement && activeElement.id === 'notnot-note-editor';
  const isInOtherInput = activeElement && !isInOurEditor && (
    activeElement.tagName === 'INPUT' || 
    activeElement.tagName === 'TEXTAREA' || 
    activeElement.contentEditable === 'true'
  );
  
  if (isInOtherInput) return;
  
  // Check if we have an overlay injector instance
  if (!window.videoDetector || !window.videoDetector.overlayInjector) {
    console.log('NotNot: Video detector not ready for shortcut');
    return;
  }
  
  // Check if the key combination matches the capture shortcut
  const sidebar = window.videoDetector.overlayInjector.sidebar;
  if (!sidebar) {
    console.log('NotNot: Sidebar not ready for shortcut');
    return;
  }
  
  const isShortcut = sidebar.checkCaptureShortcut(e);
  if (!isShortcut) return;
  
  // If we're in the editor, force handle the capture
  if (isInOurEditor) {
    console.log('NotNot: Capture shortcut in editor caught by global handler');
    // Don't return here - continue to handle the capture
  }
  
  // Now we know it's our shortcut, prevent default and log
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  console.log('NotNot: Capture shortcut detected!', sidebar.captureShortcut);
  
  // If sidebar is not visible, open it first
  if (!sidebar.isVisible) {
    console.log('NotNot: Opening sidebar before capture');
    
    // First ensure sidebar container exists
    if (!sidebar.container || !document.body.contains(sidebar.container)) {
      console.log('NotNot: Sidebar container missing, recreating...');
      sidebar.createSidebar();
    }
    
    window.videoDetector.overlayInjector.toggleSidebar();
    
    // Wait longer for sidebar to fully initialize and open
    setTimeout(() => {
      console.log('NotNot: Checking if sidebar is ready for capture');
      if (sidebar.isVisible && sidebar.currentNote) {
        console.log('NotNot: Sidebar ready, triggering capture');
        window.videoDetector.overlayInjector.handleCapture();
      } else {
        console.log('NotNot: Sidebar not ready, retrying...');
        // Try once more after additional delay
        setTimeout(() => {
          window.videoDetector.overlayInjector.handleCapture();
        }, 500);
      }
    }, 800); // Increased initial delay
  } else {
    // Sidebar is already open, capture immediately
    console.log('NotNot: Sidebar already open, capturing immediately');
    window.videoDetector.overlayInjector.handleCapture();
  }
  
  return false; // Extra prevention
}, true); // Use capture phase to intercept before YouTube

})(); // End of IIFE