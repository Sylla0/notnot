// Sidebar functionality
// Inline storage manager
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
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('captures')) {
          const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
          capturesStore.createIndex('noteId', 'noteId', { unique: false });
          capturesStore.createIndex('timestamp', 'timestamp', { unique: false });
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

class NotNotSidebar {
  constructor() {
    this.currentNote = null;
    this.captures = [];
    this.autoSaveTimer = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupMessageListener();
    this.initializeStorage();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Note editor
    const noteContent = document.getElementById('note-content');
    noteContent.addEventListener('input', () => this.handleNoteChange());
    
    // Editor toolbar
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleToolbarAction(e.target.dataset.action));
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => this.exportNotes());

  }

  setupMessageListener() {
    // Listen for messages from content script
    window.addEventListener('message', (event) => {
      if (event.data.type === 'VIDEO_INFO') {
        this.updateVideoInfo(event.data.data);
      } else if (event.data.type === 'ADD_CAPTURE') {
        this.addCapture(event.data.data);
      }
    });

  }

  async initializeStorage() {
    // Initialize IndexedDB
    this.storage = new StorageManager();
    await this.storage.init();
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  }

  async updateVideoInfo(videoInfo) {
    document.getElementById('video-title').textContent = videoInfo.title;
    document.getElementById('video-platform').textContent = videoInfo.platform.toUpperCase();

    // Load or create note for this video
    this.currentNote = await this.storage.getNoteByVideoUrl(videoInfo.url);
    
    if (!this.currentNote) {
      // Create new note
      this.currentNote = {
        id: this.generateId(),
        videoInfo: videoInfo,
        captures: [],
        notes: {
          content: '',
          codeBlocks: []
        },
        createdAt: new Date().toISOString()
      };
      await this.storage.saveNote(this.currentNote);
    } else {
      // Load existing note content
      document.getElementById('note-content').innerHTML = this.currentNote.notes.content;
      
      // Load captures
      const captures = await this.storage.getCapturesByNoteId(this.currentNote.id);
      captures.forEach(capture => this.displayCapture(capture));
    }
  }

  handleNoteChange() {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Update save status
    document.getElementById('save-status').textContent = 'Saving...';

    // Set new timer for auto-save
    this.autoSaveTimer = setTimeout(() => this.saveNote(), 1000);
  }

  async saveNote() {
    if (!this.currentNote) return;

    const noteContent = document.getElementById('note-content').innerHTML;
    this.currentNote.notes.content = noteContent;
    
    await this.storage.saveNote(this.currentNote);
    document.getElementById('save-status').textContent = 'All changes saved';
  }

  handleToolbarAction(action) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    switch (action) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'code':
        // Wrap selection in code tags
        const code = document.createElement('code');
        code.textContent = selection.toString();
        range.deleteContents();
        range.insertNode(code);
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'timestamp':
        this.insertTimestamp();
        break;
    }
  }

  insertTimestamp() {
    // Get current video timestamp from parent window
    window.parent.postMessage({ type: 'GET_TIMESTAMP' }, '*');
    
    // Insert timestamp link
    const timestamp = this.formatTimestamp(0); // Will be updated
    const link = `<a class="timestamp-link" data-time="0">[${timestamp}]</a> `;
    document.execCommand('insertHTML', false, link);
  }

  async addCapture(captureData) {
    // Save capture to storage
    captureData.noteId = this.currentNote.id;
    await this.storage.saveCapture(captureData);
    
    // Display capture
    this.displayCapture(captureData);
    
    // Update capture count
    this.captures.push(captureData);
    document.getElementById('capture-count').textContent = `${this.captures.length} captures`;
    
    // Switch to captures tab
    this.switchTab('captures');
  }

  displayCapture(capture) {
    const capturesGrid = document.getElementById('captures-grid');
    
    const captureItem = document.createElement('div');
    captureItem.className = 'capture-item';
    captureItem.innerHTML = `
      <img src="${capture.imageData}" alt="Capture at ${this.formatTimestamp(capture.timestamp)}">
      <span class="capture-timestamp">${this.formatTimestamp(capture.timestamp)}</span>
    `;
    
    captureItem.addEventListener('click', () => {
      // Insert capture into notes
      this.insertCaptureIntoNotes(capture);
    });
    
    capturesGrid.appendChild(captureItem);
  }

  insertCaptureIntoNotes(capture) {
    this.switchTab('notes');
    
    const img = `<img src="${capture.imageData}" style="max-width: 100%; margin: 8px 0;">`;
    document.execCommand('insertHTML', false, img);
  }


  async exportNotes() {
    if (!this.currentNote) return;
    
    // Create export data
    const exportData = {
      videoTitle: this.currentNote.videoInfo.title,
      videoUrl: this.currentNote.videoInfo.url,
      notes: this.currentNote.notes.content,
      captures: this.captures,
      exportDate: new Date().toISOString()
    };
    
    // Convert to markdown
    const markdown = this.convertToMarkdown(exportData);
    
    // Download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.sanitizeFilename(exportData.videoTitle)}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  convertToMarkdown(data) {
    let markdown = `# ${data.videoTitle}\n\n`;
    markdown += `**Video URL:** ${data.videoUrl}\n`;
    markdown += `**Export Date:** ${new Date(data.exportDate).toLocaleString()}\n\n`;
    
    markdown += `## Notes\n\n`;
    // Convert HTML to markdown (simplified)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.notes;
    markdown += tempDiv.textContent + '\n\n';
    
    if (data.captures.length > 0) {
      markdown += `## Captures (${data.captures.length})\n\n`;
      // Note: In a real implementation, you'd save images separately
      markdown += `*[Captures included in export folder]*\n\n`;
    }
    
    
    return markdown;
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize sidebar
new NotNotSidebar();