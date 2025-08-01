// Dashboard functionality
class NotNotDashboard {
  constructor() {
    this.notes = [];
    this.filteredNotes = [];
    this.db = null;
    this.init();
  }

  async init() {
    await this.initializeDatabase();
    await this.loadNotes();
    this.setupEventListeners();
    this.render();
  }

  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotNotDB', 1);

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

  async loadNotes() {
    const transaction = this.db.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        this.notes = request.result || [];
        this.filteredNotes = [...this.notes];
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  setupEventListeners() {
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterNotes(e.target.value);
    });

    // Export all
    document.getElementById('export-all').addEventListener('click', () => {
      this.exportAllNotes();
    });

    // Sort
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.sortNotes(e.target.value);
    });

    // Platform filters
    document.querySelectorAll('.filter-option input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.applyFilters();
      });
    });
  }

  filterNotes(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    if (!term) {
      this.filteredNotes = [...this.notes];
    } else {
      this.filteredNotes = this.notes.filter(note => {
        const title = note.videoInfo.title.toLowerCase();
        const content = (note.notes.content || '').toLowerCase();
        return title.includes(term) || content.includes(term);
      });
    }
    
    this.render();
  }

  applyFilters() {
    const checkedPlatforms = Array.from(document.querySelectorAll('.filter-option input:checked'))
      .map(cb => cb.dataset.platform)
      .filter(p => p !== 'all');

    if (checkedPlatforms.length === 0 || checkedPlatforms.includes('all')) {
      this.filteredNotes = [...this.notes];
    } else {
      this.filteredNotes = this.notes.filter(note => 
        checkedPlatforms.includes(note.videoInfo.platform)
      );
    }

    this.render();
  }

  sortNotes(sortBy) {
    switch (sortBy) {
      case 'recent':
        this.filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case 'oldest':
        this.filteredNotes.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        break;
      case 'title':
        this.filteredNotes.sort((a, b) => a.videoInfo.title.localeCompare(b.videoInfo.title));
        break;
    }
    this.render();
  }

  async render() {
    const grid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('empty-state');
    const notesCount = document.getElementById('notes-count');

    notesCount.textContent = `${this.filteredNotes.length} notes`;

    if (this.filteredNotes.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = '';

    for (const note of this.filteredNotes) {
      const captures = await this.getCaptureCount(note.id);
      const card = this.createNoteCard(note, captures);
      grid.appendChild(card);
    }
  }

  async getCaptureCount(noteId) {
    const transaction = this.db.transaction(['captures'], 'readonly');
    const store = transaction.objectStore('captures');
    const index = store.index('noteId');
    
    return new Promise((resolve) => {
      const request = index.count(noteId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  createNoteCard(note, captureCount) {
    const card = document.createElement('div');
    card.className = 'note-card';
    
    const preview = this.getTextPreview(note.notes.content);
    const updatedDate = this.formatDate(note.updatedAt);

    card.innerHTML = `
      <div class="note-card-header">
        <h3 class="note-card-title">${note.videoInfo.title}</h3>
        <span class="note-platform">${note.videoInfo.platform}</span>
      </div>
      <p class="note-card-preview">${preview}</p>
      <div class="note-card-footer">
        <div class="note-stats">
          <span class="note-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            ${captureCount} captures
          </span>
        </div>
        <span>${updatedDate}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      chrome.tabs.create({ url: note.videoInfo.url });
    });

    return card;
  }

  getTextPreview(htmlContent) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    const text = temp.textContent || temp.innerText || '';
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
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

  async exportAllNotes() {
    let markdown = '# NotNot - All Notes\n\n';
    markdown += `Exported on ${new Date().toLocaleString()}\n\n`;
    markdown += `Total notes: ${this.filteredNotes.length}\n\n`;
    markdown += '---\n\n';

    for (const note of this.filteredNotes) {
      markdown += `## ${note.videoInfo.title}\n\n`;
      markdown += `**Platform:** ${note.videoInfo.platform}\n`;
      markdown += `**URL:** ${note.videoInfo.url}\n`;
      markdown += `**Last updated:** ${new Date(note.updatedAt).toLocaleString()}\n\n`;
      
      // Convert HTML to text
      const temp = document.createElement('div');
      temp.innerHTML = note.notes.content;
      markdown += temp.textContent + '\n\n';
      
      markdown += '---\n\n';
    }

    // Download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notnot_all_notes_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize dashboard
new NotNotDashboard();