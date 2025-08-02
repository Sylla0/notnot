// NotNot Overlay Injector - Video overlay controls
import { CONSTANTS, CSS_CLASSES } from './constants.js';
import { utils } from './utils.js';
import { CaptureHandler } from './capture-handler.js';
import { StorageManager } from './storage-manager.js';

export class OverlayInjector {
  constructor(videoElement) {
    this.video = videoElement;
    this.overlay = null;
    this.sidebar = null;
    this.captureHandler = null;
    this.storage = new StorageManager();
    this.captureButtonLongPressTimer = null;
    this.isLongPress = false;
    
    // Event cleanup tracking
    this.eventCleanup = [];
  }

  async init() {
    console.log('OverlayInjector: Initializing...');
    
    // Initialize storage
    await this.storage.init();
    
    // Initialize capture handler
    this.captureHandler = new CaptureHandler(this.video, this.storage);
    
    // Create overlay
    this.createOverlay();
    
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
}