import { CONSTANTS } from '../shared/constants.js';
import { utils } from '../shared/utils.js';

export class OverlayInjector {
  constructor(videoElement) {
    this.video = videoElement;
    this.overlay = null;
    this.sidebar = null;
    this.sidebarVisible = false;
  }

  inject() {
    this.createOverlay();
    this.createSidebar();
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
        <button class="notnot-btn notnot-record" title="Start Transcription">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <div class="notnot-timestamp">00:00</div>
      </div>
    `;

    // Position overlay relative to video
    const videoContainer = this.video.parentElement;
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(this.overlay);

    // Update timestamp
    this.updateTimestamp();
  }

  createSidebar() {
    // Create sidebar iframe
    this.sidebar = document.createElement('iframe');
    this.sidebar.className = 'notnot-sidebar';
    this.sidebar.src = chrome.runtime.getURL('sidebar/sidebar.html');
    this.sidebar.style.display = 'none';
    document.body.appendChild(this.sidebar);
  }

  attachEventListeners() {
    // Capture button
    const captureBtn = this.overlay.querySelector('.notnot-capture');
    captureBtn.addEventListener('click', () => this.handleCapture());

    // Toggle notes button
    const toggleBtn = this.overlay.querySelector('.notnot-toggle-notes');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // Record button
    const recordBtn = this.overlay.querySelector('.notnot-record');
    recordBtn.addEventListener('click', () => this.handleRecord());

    // Update timestamp on video time update
    this.video.addEventListener('timeupdate', () => this.updateTimestamp());
  }

  handleCapture() {
    // Import capture handler
    import('./capture-handler.js').then(module => {
      const captureHandler = new module.CaptureHandler(this.video);
      captureHandler.captureFrame().then(capture => {
        // Send capture to sidebar
        this.sendToSidebar({
          type: 'ADD_CAPTURE',
          data: capture
        });

        // Show sidebar if hidden
        if (!this.sidebarVisible) {
          this.toggleSidebar();
        }
      });
    });
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    this.sidebar.style.display = this.sidebarVisible ? 'block' : 'none';
    
    // Adjust video container width
    const videoContainer = this.video.parentElement;
    if (this.sidebarVisible) {
      videoContainer.style.marginRight = CONSTANTS.UI.SIDEBAR_WIDTH;
      
      // Send current video info to sidebar
      this.sendToSidebar({
        type: 'VIDEO_INFO',
        data: {
          url: window.location.href,
          title: utils.getVideoTitle(),
          platform: utils.detectPlatform(window.location.href)
        }
      });
    } else {
      videoContainer.style.marginRight = '0';
    }
  }

  handleRecord() {
    const recordBtn = this.overlay.querySelector('.notnot-record');
    const isRecording = recordBtn.classList.contains('recording');

    if (isRecording) {
      recordBtn.classList.remove('recording');
      // Stop recording logic
      chrome.runtime.sendMessage({ type: CONSTANTS.MESSAGES.STOP_RECORDING });
    } else {
      recordBtn.classList.add('recording');
      // Start recording logic
      chrome.runtime.sendMessage({ type: CONSTANTS.MESSAGES.START_RECORDING });
    }
  }

  updateTimestamp() {
    const timestampEl = this.overlay.querySelector('.notnot-timestamp');
    if (timestampEl) {
      timestampEl.textContent = utils.formatTimestamp(this.video.currentTime);
    }
  }

  sendToSidebar(message) {
    if (this.sidebar && this.sidebar.contentWindow) {
      this.sidebar.contentWindow.postMessage(message, '*');
    }
  }
}