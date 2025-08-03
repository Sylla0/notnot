// NotNot Sidebar UI - Note-taking interface
import { CONSTANTS, CSS_CLASSES, EVENTS } from './constants.js';
import { utils } from './utils.js';

export class SidebarUI {
  constructor(storageManager) {
    this.storage = storageManager;
    this.container = null;
    this.isVisible = false;
    this.currentNote = null;
    this.lastCursorPosition = null;
    this.eventCleanup = [];
    
    // Settings
    this.captureShortcut = CONSTANTS.SHORTCUTS.CAPTURE;
    this.settings = {};
    
    // Document-level listeners
    this.documentListeners = null;
  }

  async init() {
    await this.loadSettings();
    this.createSidebar();
    this.setupKeyboardShortcuts();
  }

  async loadSettings() {
    this.settings = await this.storage.getSettings();
    this.captureShortcut = this.settings.captureShortcut || CONSTANTS.SHORTCUTS.CAPTURE;
  }

  createSidebar() {
    // Check if sidebar already exists
    const existingSidebar = document.getElementById('notnot-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'notnot-sidebar';
    this.container.className = CSS_CLASSES.SIDEBAR;
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

    // Build sidebar content
    this.buildSidebarContent();
    
    // Add to DOM
    document.body.appendChild(this.container);
  }

  buildSidebarContent() {
    this.container.innerHTML = `
      <div class="notnot-header" style="padding: 20px; border-bottom: 1px solid #e5e7eb; background: #ffffff;">
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
      </div>
      
      <div class="notnot-toolbar" style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
        ${this.createToolbar()}
      </div>
      
      <div class="notnot-content" style="flex: 1; overflow-y: auto; padding: 20px;">
        <div id="notnot-note-editor" contenteditable="true" style="
          min-height: 300px;
          outline: none;
          font-size: 16px;
          line-height: 1.6;
          color: #111827;
        " placeholder="Start taking notes..."></div>
      </div>
      
      <div class="notnot-footer" style="padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="notnot-shortcut-info" style="font-size: 12px; color: #6b7280;">캡처 단축키: ${this.captureShortcut}</span>
          <div style="display: flex; gap: 8px;">
            <button id="notnot-recent-notes" class="notnot-btn-secondary">Recent Notes</button>
            <button id="notnot-import-pdf" class="notnot-btn-secondary">Import PDF</button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  createToolbar() {
    return `
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
    `;
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .notnot-toolbar-btn {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notnot-toolbar-btn:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }
      
      .notnot-toolbar-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .notnot-btn-secondary {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .notnot-btn-secondary:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }
      
      #notnot-note-editor:empty:before {
        content: attr(placeholder);
        color: #9ca3af;
        pointer-events: none;
      }
      
      #notnot-note-editor img {
        max-width: 100%;
        height: auto;
        margin: 10px 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
    this.eventCleanup.push(() => style.remove());
  }

  setupEventListeners() {
    const editor = document.getElementById('notnot-note-editor');
    
    // Auto-save on input
    const saveHandler = utils.debounce(() => {
      this.saveNote();
    }, CONSTANTS.UI.DEBOUNCE_DELAY);
    
    const inputCleanup = utils.addEventListener(editor, 'input', saveHandler);
    this.eventCleanup.push(inputCleanup);

    // Toolbar buttons
    document.querySelectorAll('.notnot-toolbar-btn').forEach(btn => {
      const cleanup = utils.addEventListener(btn, 'click', () => {
        const command = btn.dataset.command;
        document.execCommand(command, false, null);
        editor.focus();
      });
      this.eventCleanup.push(cleanup);
    });

    // Close button
    const closeBtn = document.getElementById('notnot-close-btn');
    const closeCleanup = utils.addEventListener(closeBtn, 'click', () => {
      this.toggle();
    });
    this.eventCleanup.push(closeCleanup);

    // Export PDF button
    const exportBtn = document.getElementById('notnot-export-pdf');
    if (exportBtn) {
      const exportCleanup = utils.addEventListener(exportBtn, 'click', () => {
        this.exportToPDF();
      });
      this.eventCleanup.push(exportCleanup);
    }

    // Recent notes button
    const recentBtn = document.getElementById('notnot-recent-notes');
    const recentCleanup = utils.addEventListener(recentBtn, 'click', () => {
      this.showRecentNotes();
    });
    this.eventCleanup.push(recentCleanup);

    // Import PDF button
    const importBtn = document.getElementById('notnot-import-pdf');
    const importCleanup = utils.addEventListener(importBtn, 'click', () => {
      this.importPDF();
    });
    this.eventCleanup.push(importCleanup);
  }

  setupKeyboardShortcuts() {
    // Capture shortcut handler
    this.documentListeners = {
      keydown: (e) => {
        const shortcutParts = this.captureShortcut.toLowerCase().split('+');
        const keyPressed = e.key.toLowerCase();
        
        const hasAlt = shortcutParts.includes('alt') === e.altKey;
        const hasCtrl = shortcutParts.includes('ctrl') === e.ctrlKey;
        const hasShift = shortcutParts.includes('shift') === e.shiftKey;
        const keyMatch = shortcutParts[shortcutParts.length - 1] === keyPressed;
        
        if (hasAlt && hasCtrl && hasShift && keyMatch) {
          e.preventDefault();
          e.stopPropagation();
          
          // Trigger capture through parent
          if (window.notnotVideoDetector && window.notnotVideoDetector.overlayInjector) {
            window.notnotVideoDetector.overlayInjector.handleCapture();
          }
        }
      }
    };

    // Add to document with capture phase
    document.addEventListener('keydown', this.documentListeners.keydown, true);
  }

  async toggle() {
    this.isVisible = !this.isVisible;
    
    if (this.isVisible) {
      this.container.style.right = '0';
      await this.updateVideoInfo();
      await this.loadNote();
    } else {
      this.container.style.right = `-${CONSTANTS.UI.SIDEBAR_WIDTH}`;
    }
  }

  async updateVideoInfo() {
    const title = utils.getVideoTitle();
    const titleEl = document.getElementById('notnot-video-title');
    if (titleEl) {
      titleEl.textContent = title;
    }

    // Create or update note
    const videoUrl = window.location.href;
    this.currentNote = await this.storage.getNoteByVideoUrl(videoUrl);
    
    if (!this.currentNote) {
      this.currentNote = {
        id: utils.generateId(),
        videoInfo: {
          title: title,
          url: videoUrl,
          platform: CONSTANTS.VIDEO_PLATFORMS.YOUTUBE
        },
        notes: {
          content: ''
        },
        createdAt: new Date().toISOString()
      };
      await this.storage.saveNote(this.currentNote);
    }
  }

  async loadNote() {
    const editor = document.getElementById('notnot-note-editor');
    if (this.currentNote && this.currentNote.notes.content) {
      editor.innerHTML = this.currentNote.notes.content;
    } else {
      editor.innerHTML = '';
    }
  }

  async saveNote() {
    if (!this.currentNote) return;
    
    const editor = document.getElementById('notnot-note-editor');
    this.currentNote.notes.content = editor.innerHTML;
    await this.storage.saveNote(this.currentNote);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent(EVENTS.NOTE_SAVED, {
      detail: { note: this.currentNote }
    }));
  }

  async addCapture(captureData) {
    console.log('SidebarUI: addCapture called');
    console.log('SidebarUI: storage exists?', !!this.storage);
    console.log('SidebarUI: storage.db exists?', !!this.storage?.db);
    
    if (!this.currentNote) {
      await this.updateVideoInfo();
    }

    // Save capture
    captureData.noteId = this.currentNote.id;
    await this.storage.saveCapture(captureData);

    // Insert into editor
    const editor = document.getElementById('notnot-note-editor');
    const img = document.createElement('img');
    img.src = captureData.imageData;
    img.alt = `Screenshot at ${captureData.videoTimestamp}`;
    img.title = `Captured at ${captureData.videoTimestamp}`;
    
    // Insert at cursor position or append
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.insertNode(img);
      range.collapse(false);
    } else {
      editor.appendChild(img);
    }

    // Save note
    await this.saveNote();
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent(EVENTS.CAPTURE_TAKEN, {
      detail: { capture: captureData }
    }));
  }

  async exportToPDF() {
    if (!this.currentNote) {
      alert('No note to export!');
      return;
    }

    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    
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
          .note-content img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          @media print {
            body { padding: 20px; }
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
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  async showRecentNotes() {
    // Simple implementation - would be expanded with UI
    const notes = await this.storage.getAllNotes();
    const recentNotes = notes
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, CONSTANTS.LIMITS.RECENT_NOTES_COUNT);
    
    console.log('Recent notes:', recentNotes);
    // TODO: Implement UI for recent notes
  }

  async importPDF() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const editor = document.getElementById('notnot-note-editor');
        editor.innerHTML += `
          <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">📄 ${file.name}</p>
            <iframe src="${e.target.result}" width="100%" height="600" style="border: 1px solid #e5e7eb; border-radius: 4px;"></iframe>
          </div>
        `;
        this.saveNote();
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  }

  destroy() {
    // Remove event listeners
    if (this.documentListeners) {
      document.removeEventListener('keydown', this.documentListeners.keydown, true);
    }
    
    // Clean up other event listeners
    this.eventCleanup.forEach(cleanup => cleanup());
    this.eventCleanup = [];
    
    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}