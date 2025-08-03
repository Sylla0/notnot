// NotNot Storage Manager - IndexedDB and Chrome Storage integration
import { CONSTANTS } from './constants.js';
import { utils } from './utils.js';

export class StorageManager {
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