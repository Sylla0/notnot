// NotNot Background Service Worker
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

class NotNotBackground {
  constructor() {
    this.activeTabId = null;
    this.setupListeners();
  }

  setupListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case CONSTANTS.MESSAGES.VIDEO_DETECTED:
          this.handleVideoDetected(sender.tab, request.data);
          break;
        case CONSTANTS.MESSAGES.SAVE_NOTE:
          this.saveNote(request.data);
          break;
      }
      return true;
    });

    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      this.toggleSidebar(tab.id);
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.checkForVideo(tab);
      }
    });

    // Handle installation
    chrome.runtime.onInstalled.addListener(() => {
      this.onInstalled();
    });
  }

  handleVideoDetected(tab, videoInfo) {
    this.activeTabId = tab.id;
    
    // Update extension icon
    chrome.action.setBadgeText({
      text: 'ON',
      tabId: tab.id
    });
    
    chrome.action.setBadgeBackgroundColor({
      color: '#3b82f6',
      tabId: tab.id
    });

    // Store video info
    chrome.storage.local.set({
      [CONSTANTS.STORAGE_KEYS.CURRENT_VIDEO]: videoInfo
    });
  }


  toggleSidebar(tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: CONSTANTS.MESSAGES.TOGGLE_SIDEBAR
    });
  }

  checkForVideo(tab) {
    // Check if URL is YouTube
    const isYouTube = tab.url && (
      tab.url.includes('youtube.com/watch') || 
      tab.url.includes('youtube.com/embed')
    );

    if (isYouTube) {
      console.log('NotNot: YouTube video page detected, injecting script...');
      // Inject content scripts if needed
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/notnot-content.js']
      }).catch(err => {
        console.log('NotNot: Script injection failed', err);
      });
    }
  }

  onInstalled() {
    // Create context menu items
    chrome.contextMenus.create({
      id: 'notnot-capture',
      title: 'Capture with NotNot',
      contexts: ['video', 'image']
    });

    chrome.contextMenus.create({
      id: 'notnot-note',
      title: 'Add to NotNot notes',
      contexts: ['selection']
    });

    // Set up context menu listeners
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'notnot-capture') {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CONTEXT_CAPTURE',
          data: { srcUrl: info.srcUrl }
        });
      } else if (info.menuItemId === 'notnot-note') {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CONTEXT_NOTE',
          data: { text: info.selectionText }
        });
      }
    });
  }

  async saveNote(noteData) {
    // In a full implementation, this would sync to cloud storage
    // For MVP, we're using IndexedDB in content script
    console.log('Note saved:', noteData);
  }
}

// Initialize background service
new NotNotBackground();