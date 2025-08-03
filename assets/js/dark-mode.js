// NotNot Dark Mode Manager
class DarkModeManager {
  constructor() {
    this.STORAGE_KEY = 'notnot_theme';
    this.currentTheme = null;
    this.init();
  }

  init() {
    // Load saved theme preference
    this.loadTheme();
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!this.currentTheme || this.currentTheme === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  async loadTheme() {
    // Get theme from Chrome storage
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.STORAGE_KEY, (result) => {
        const savedTheme = result[this.STORAGE_KEY] || 'auto';
        this.applyTheme(savedTheme);
        resolve(savedTheme);
      });
    });
  }

  async saveTheme(theme) {
    this.currentTheme = theme;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: theme }, () => {
        resolve();
      });
    });
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      // Auto mode - follow system preference
      root.removeAttribute('data-theme');
    }
    
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
  }

  async toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.currentTheme || 'auto');
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    
    this.applyTheme(nextTheme);
    await this.saveTheme(nextTheme);
    
    return nextTheme;
  }

  getTheme() {
    return this.currentTheme || 'auto';
  }

  // Helper to get actual theme (resolving 'auto' to actual theme)
  getActiveTheme() {
    if (this.currentTheme === 'dark') return 'dark';
    if (this.currentTheme === 'light') return 'light';
    
    // Auto mode - check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Create theme toggle button UI
  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'theme-toggle-btn';
    button.setAttribute('aria-label', 'Toggle theme');
    button.innerHTML = this.getToggleIcon();
    
    button.addEventListener('click', async () => {
      const newTheme = await this.toggleTheme();
      button.innerHTML = this.getToggleIcon();
      this.showToast(`Theme: ${this.getThemeLabel(newTheme)}`);
    });
    
    return button;
  }

  getToggleIcon() {
    const theme = this.getTheme();
    const icons = {
      light: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`,
      dark: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>`,
      auto: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
      </svg>`
    };
    
    return icons[theme] || icons.auto;
  }

  getThemeLabel(theme) {
    const labels = {
      light: 'Light Mode',
      dark: 'Dark Mode',
      auto: 'Auto (System)'
    };
    return labels[theme] || 'Auto';
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'theme-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px var(--shadow);
      border: 1px solid var(--border-color);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .theme-toggle-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .theme-toggle-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--border-hover);
  }
`;
document.head.appendChild(style);

// Create global instance
window.darkModeManager = new DarkModeManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DarkModeManager;
}