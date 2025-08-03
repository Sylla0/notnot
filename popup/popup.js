// NotNot Popup
const CONSTANTS = {
  STORAGE_KEYS: {
    NOTES: 'notnot_notes',
    SETTINGS: 'notnot_settings',
    CURRENT_VIDEO: 'notnot_current_video'
  },
  
  MESSAGES: {
    VIDEO_DETECTED: 'video_detected',
    CAPTURE_SCREENSHOT: 'capture_screenshot',
    DEFINE_CAPTURE_AREA: 'define_capture_area',
    TOGGLE_SIDEBAR: 'toggle_sidebar',
    SAVE_NOTE: 'save_note'
  }
};

class NotNotPopup {
  constructor() {
    this.currentTab = null;
    this.init();
  }

  async init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;

    // Initialize dark mode
    this.initDarkMode();

    // Check for video
    this.checkVideoStatus();

    // Setup event listeners
    this.setupEventListeners();

    // Load recent notes
    this.loadRecentNotes();
  }

  initDarkMode() {
    // Initialize dark mode manager
    if (window.darkModeManager) {
      // Update theme toggle button
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) {
        themeToggle.innerHTML = window.darkModeManager.getToggleIcon();
        
        themeToggle.addEventListener('click', async () => {
          const newTheme = await window.darkModeManager.toggleTheme();
          themeToggle.innerHTML = window.darkModeManager.getToggleIcon();
        });
      }
    }
  }

  setupEventListeners() {
    // Toggle sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
      this.sendMessageToTab({ type: CONSTANTS.MESSAGES.TOGGLE_SIDEBAR });
      window.close();
    });

    // Capture screenshot
    document.getElementById('capture-screenshot').addEventListener('click', () => {
      this.sendMessageToTab({ type: CONSTANTS.MESSAGES.CAPTURE_SCREENSHOT });
      window.close();
    });
    
    // Define capture area
    document.getElementById('define-capture-area').addEventListener('click', () => {
      this.sendMessageToTab({ type: CONSTANTS.MESSAGES.DEFINE_CAPTURE_AREA });
      window.close();
    });


    // All notes
    document.getElementById('all-notes').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
      window.close();
    });

    // Settings
    document.getElementById('settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }

  async checkVideoStatus() {
    // First check if we're on YouTube
    if (!this.currentTab.url || !this.currentTab.url.includes('youtube.com')) {
      console.log('Popup: Not on YouTube');
      this.showNoVideoMessage();
      return;
    }

    // Check if current tab has video
    chrome.storage.local.get(CONSTANTS.STORAGE_KEYS.CURRENT_VIDEO, (result) => {
      const videoInfo = result[CONSTANTS.STORAGE_KEYS.CURRENT_VIDEO];
      
      if (videoInfo && videoInfo.url === this.currentTab.url) {
        this.showVideoStatus(videoInfo);
      } else {
        // Try to detect video by sending a message
        chrome.tabs.sendMessage(this.currentTab.id, { type: 'CHECK_VIDEO' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Popup: No content script detected, trying to inject...');
            this.injectContentScriptAndCheck();
          } else if (response && response.hasVideo) {
            this.showVideoStatus({
              title: response.title || 'YouTube Video',
              url: this.currentTab.url
            });
          } else {
            this.showNoVideoMessage();
          }
        });
      }
    });
  }

  injectContentScriptAndCheck() {
    chrome.scripting.executeScript({
      target: { tabId: this.currentTab.id },
      files: ['content-scripts/notnot-content.js']
    }).then(() => {
      console.log('Popup: Content script injected');
      // Wait a bit for initialization
      setTimeout(() => {
        chrome.tabs.sendMessage(this.currentTab.id, { type: 'CHECK_VIDEO' }, (response) => {
          if (chrome.runtime.lastError || !response || !response.hasVideo) {
            this.showNoVideoMessage();
          } else {
            this.showVideoStatus({
              title: response.title || 'YouTube Video',
              url: this.currentTab.url
            });
          }
        });
      }, 1000);
    }).catch(err => {
      console.error('Popup: Failed to inject content script:', err);
      this.showNoVideoMessage();
    });
  }

  showNoVideoMessage() {
    const statusEl = document.getElementById('video-status');
    const titleEl = document.getElementById('video-title');
    
    statusEl.classList.remove('hidden');
    titleEl.textContent = 'Navigate to a YouTube video to use NotNot';
    
    // Disable action buttons
    document.getElementById('toggle-sidebar').disabled = true;
    document.getElementById('capture-screenshot').disabled = true;
    document.getElementById('define-capture-area').disabled = true;
  }

  showVideoStatus(videoInfo) {
    const statusEl = document.getElementById('video-status');
    const titleEl = document.getElementById('video-title');
    
    statusEl.classList.remove('hidden');
    titleEl.textContent = videoInfo.title;
  }

  async loadRecentNotes() {
    const notesList = document.getElementById('notes-list');
    
    // Load recent notes from Chrome storage
    chrome.storage.local.get('notnot_recent_notes', (result) => {
      const recentNotes = result.notnot_recent_notes || [];
      
      if (recentNotes.length === 0) {
        notesList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <p>No notes yet</p>
            <p style="font-size: 12px; margin-top: 4px;">Visit a video to start taking notes</p>
          </div>
        `;
      } else {
        this.displayRecentNotes(recentNotes);
      }
    });
  }

  displayRecentNotes(notes) {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';
    
    notes.forEach(note => {
      const noteItem = document.createElement('div');
      noteItem.className = 'note-item';
      noteItem.innerHTML = `
        <div class="note-item-title">${note.videoInfo.title}</div>
        <div class="note-item-preview">${note.preview || 'No content yet...'}</div>
        <div class="note-item-meta">
          <span class="note-item-platform">${note.videoInfo.platform}</span>
          <span>${this.formatDate(note.updatedAt)}</span>
        </div>
      `;
      
      noteItem.addEventListener('click', () => {
        // Navigate to the video and open the sidebar
        chrome.tabs.create({ url: note.videoInfo.url }, (tab) => {
          // Wait for the tab to load, then send message to open sidebar
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: CONSTANTS.MESSAGES.TOGGLE_SIDEBAR });
          }, 2000);
        });
      });
      
      notesList.appendChild(noteItem);
    });
  }


  sendMessageToTab(message) {
    console.log('Popup: Sending message to tab', message);
    chrome.tabs.sendMessage(this.currentTab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Popup: Error sending message:', chrome.runtime.lastError);
        // Try injecting content script first
        chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['content-scripts/notnot-content.js']
        }).then(() => {
          console.log('Popup: Content script injected, retrying message...');
          // Retry sending message after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(this.currentTab.id, message, (retryResponse) => {
              if (chrome.runtime.lastError) {
                console.error('Popup: Failed after retry:', chrome.runtime.lastError);
                alert('Please refresh the YouTube page and try again.');
              } else {
                console.log('Popup: Message sent successfully after retry', retryResponse);
              }
            });
          }, 500);
        }).catch(err => {
          console.error('Popup: Failed to inject content script:', err);
          alert('NotNot only works on YouTube video pages. Please navigate to a YouTube video.');
        });
      } else {
        console.log('Popup: Message sent successfully', response);
      }
    });
  }

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
  }
}

// Initialize popup
new NotNotPopup();