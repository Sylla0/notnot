// Options page functionality
class NotNotOptions {
  constructor() {
    this.settings = {
      autoSave: true,
      showOverlay: true,
      autoDetect: true,
      captureQuality: 0.92,
      captureFormat: 'jpeg',
      captureShortcut: 'Alt+S',
      defineAreaShortcut: 'Alt+Shift+A',
      rememberCaptureArea: true,
      exportFormat: 'markdown',
      includeTimestamps: true
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.initDarkMode();
  }

  initDarkMode() {
    // Initialize theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && window.darkModeManager) {
      // Set current theme
      const currentTheme = window.darkModeManager.getTheme();
      themeSelect.value = currentTheme;
      
      // Handle theme changes
      themeSelect.addEventListener('change', async (e) => {
        const newTheme = e.target.value;
        window.darkModeManager.applyTheme(newTheme);
        await window.darkModeManager.saveTheme(newTheme);
      });
    }
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('notnot_settings', (result) => {
        if (result.notnot_settings) {
          this.settings = { ...this.settings, ...result.notnot_settings };
        }
        resolve();
      });
    });
  }

  async saveSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ notnot_settings: this.settings }, () => {
        this.showSaveStatus();
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Auto-save
    document.getElementById('auto-save').addEventListener('change', (e) => {
      this.settings.autoSave = e.target.checked;
    });

    // Show overlay
    document.getElementById('show-overlay').addEventListener('change', (e) => {
      this.settings.showOverlay = e.target.checked;
    });

    // Auto-detect
    document.getElementById('auto-detect').addEventListener('change', (e) => {
      this.settings.autoDetect = e.target.checked;
    });

    // Capture quality
    document.getElementById('capture-quality').addEventListener('change', (e) => {
      this.settings.captureQuality = parseFloat(e.target.value);
    });

    // Capture format
    document.getElementById('capture-format').addEventListener('change', (e) => {
      this.settings.captureFormat = e.target.value;
    });
    
    // Capture shortcut
    this.setupShortcutCapture('capture-shortcut', 'captureShortcut');
    
    // Define area shortcut
    this.setupShortcutCapture('define-area-shortcut', 'defineAreaShortcut');
    
    // Remember capture area
    document.getElementById('remember-capture-area').addEventListener('change', (e) => {
      this.settings.rememberCaptureArea = e.target.checked;
    });


    // Export format
    document.getElementById('export-format').addEventListener('change', (e) => {
      this.settings.exportFormat = e.target.value;
    });

    // Include timestamps
    document.getElementById('include-timestamps').addEventListener('change', (e) => {
      this.settings.includeTimestamps = e.target.checked;
    });

    // Save button
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Export data
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportAllData();
    });

    // Clear data
    document.getElementById('clear-data').addEventListener('click', () => {
      this.clearAllData();
    });

    // Report issue
    document.getElementById('report-issue').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/yourusername/notnot/issues' });
    });
  }

  updateUI() {
    // Update checkboxes
    document.getElementById('auto-save').checked = this.settings.autoSave;
    document.getElementById('show-overlay').checked = this.settings.showOverlay;
    document.getElementById('auto-detect').checked = this.settings.autoDetect;
    document.getElementById('include-timestamps').checked = this.settings.includeTimestamps;
    document.getElementById('remember-capture-area').checked = this.settings.rememberCaptureArea;

    // Update selects
    document.getElementById('capture-quality').value = this.settings.captureQuality;
    document.getElementById('capture-format').value = this.settings.captureFormat;
    document.getElementById('export-format').value = this.settings.exportFormat;
    
    // Update inputs
    document.getElementById('capture-shortcut').value = this.settings.captureShortcut;
    document.getElementById('define-area-shortcut').value = this.settings.defineAreaShortcut || 'Alt+Shift+A';
  }

  showSaveStatus() {
    const status = document.getElementById('save-status');
    status.textContent = 'Settings saved!';
    status.classList.add('show');
    
    setTimeout(() => {
      status.classList.remove('show');
    }, 3000);
  }

  async exportAllData() {
    // Open IndexedDB
    const db = await this.openDatabase();
    
    // Get all notes
    const notes = await this.getAllNotes(db);
    
    // Get all captures
    const captures = await this.getAllCaptures(db);
    
    // Create export object
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      settings: this.settings,
      notes: notes,
      captures: captures
    };
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notnot_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearAllData() {
    const confirmed = confirm('Are you sure you want to delete all your notes and settings? This cannot be undone.');
    
    if (!confirmed) return;
    
    const doubleConfirmed = confirm('This will permanently delete ALL your NotNot data. Are you absolutely sure?');
    
    if (!doubleConfirmed) return;
    
    // Clear IndexedDB
    await this.clearDatabase();
    
    // Clear chrome storage
    chrome.storage.sync.clear();
    chrome.storage.local.clear();
    
    // Reset settings
    this.settings = {
      autoSave: true,
      showOverlay: true,
      autoDetect: true,
      captureQuality: 0.92,
      captureFormat: 'jpeg',
      captureShortcut: 'Alt+S',
      defineAreaShortcut: 'Alt+Shift+A',
      rememberCaptureArea: true,
      exportFormat: 'markdown',
      includeTimestamps: true
    };
    
    this.updateUI();
    
    alert('All data has been cleared. The extension has been reset to default settings.');
  }
  
  setupShortcutCapture(inputId, settingKey) {
    const input = document.getElementById(inputId);
    let isCapturing = false;
    
    // Prevent normal typing
    input.addEventListener('keydown', (e) => {
      if (isCapturing) {
        e.preventDefault();
      }
    });
    
    // Start capturing on focus
    input.addEventListener('focus', () => {
      isCapturing = true;
      input.value = 'Press shortcut keys...';
      input.style.backgroundColor = '#e0f2fe';
    });
    
    // Capture the shortcut
    input.addEventListener('keyup', (e) => {
      if (!isCapturing) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Ignore modifier keys alone
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }
      
      // Build shortcut string
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Cmd');
      
      // Add the actual key
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      parts.push(key);
      
      const shortcut = parts.join('+');
      
      // Validate shortcut (must have at least one modifier)
      if (parts.length < 2) {
        input.value = 'Please use a modifier key (Ctrl, Alt, Shift)';
        input.style.backgroundColor = '#fee2e2';
        return;
      }
      
      // Set the shortcut
      input.value = shortcut;
      input.style.backgroundColor = '#dcfce7';
      this.settings[settingKey] = shortcut;
      
      // End capture
      isCapturing = false;
      input.blur();
    });
    
    // Cancel capturing on blur
    input.addEventListener('blur', () => {
      if (isCapturing && input.value === 'Press shortcut keys...') {
        input.value = this.settings[settingKey];
      }
      isCapturing = false;
      input.style.backgroundColor = '';
    });
    
    // Cancel on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isCapturing) {
        e.preventDefault();
        input.value = this.settings[settingKey];
        isCapturing = false;
        input.blur();
      }
    });
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotNotDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getAllNotes(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getAllCaptures(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['captures'], 'readonly');
      const store = transaction.objectStore('captures');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  clearDatabase() {
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase('NotNotDB');
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(deleteReq.error);
    });
  }
}

// Initialize options page
new NotNotOptions();