import { CONSTANTS } from './constants.js';
import { utils } from './utils.js';

// Storage management with IndexedDB
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

        // Create notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('videoUrl', 'videoInfo.url', { unique: false });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create captures store
        if (!db.objectStoreNames.contains('captures')) {
          const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
          capturesStore.createIndex('noteId', 'noteId', { unique: false });
          capturesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Save note
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

  // Get note by video URL
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

  // Save capture
  async saveCapture(capture) {
    const transaction = this.db.transaction(['captures'], 'readwrite');
    const store = transaction.objectStore('captures');
    
    return new Promise((resolve, reject) => {
      const request = store.put(capture);
      request.onsuccess = () => resolve(capture);
      request.onerror = () => reject(request.error);
    });
  }

  // Get captures for note
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

  // Chrome storage sync for settings
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [CONSTANTS.STORAGE_KEYS.SETTINGS]: settings }, resolve);
    });
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        resolve(result[CONSTANTS.STORAGE_KEYS.SETTINGS] || {});
      });
    });
  }
}

export const storage = new StorageManager();