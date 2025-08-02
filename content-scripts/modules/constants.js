// NotNot Constants - Central configuration
export const CONSTANTS = {
  STORAGE_KEYS: {
    NOTES: 'notnot_notes',
    SETTINGS: 'notnot_settings',
    CURRENT_VIDEO: 'notnot_current_video',
    RECENT_NOTES: 'notnot_recent_notes',
    CAPTURE_AREA: 'notnot_capture_area'
  },
  
  VIDEO_PLATFORMS: {
    YOUTUBE: 'youtube',
    VIMEO: 'vimeo',
    COURSERA: 'coursera',
    UDEMY: 'udemy'
  },
  
  MESSAGES: {
    VIDEO_DETECTED: 'video_detected',
    CAPTURE_SCREENSHOT: 'capture_screenshot',
    TOGGLE_SIDEBAR: 'toggle_sidebar',
    SAVE_NOTE: 'save_note',
    START_RECORDING: 'start_recording',
    STOP_RECORDING: 'stop_recording',
    CHECK_VIDEO: 'CHECK_VIDEO'
  },
  
  UI: {
    SIDEBAR_WIDTH: '400px',
    OVERLAY_Z_INDEX: 9999,
    CAPTURE_QUALITY: 0.92,
    CAPTURE_FORMAT: 'jpeg',
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 1000
  },
  
  SHORTCUTS: {
    CAPTURE: 'Alt+S',
    TOGGLE_NOTES: 'Alt+N'
  },
  
  LIMITS: {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_NOTES_LENGTH: 100000, // characters
    RECENT_NOTES_COUNT: 5
  }
};

// CSS classes for consistent styling
export const CSS_CLASSES = {
  // Container classes
  SIDEBAR: 'notnot-sidebar',
  OVERLAY: 'notnot-overlay',
  CAPTURE_AREA: 'notnot-capture-area',
  
  // Button classes
  BUTTON: 'notnot-btn',
  BUTTON_PRIMARY: 'notnot-btn-primary',
  BUTTON_SECONDARY: 'notnot-btn-secondary',
  BUTTON_ACTIVE: 'notnot-btn-active',
  
  // State classes
  VISIBLE: 'notnot-visible',
  HIDDEN: 'notnot-hidden',
  LOADING: 'notnot-loading',
  ERROR: 'notnot-error'
};

// Event names for consistent event handling
export const EVENTS = {
  // Custom events
  NOTE_SAVED: 'notnot:note-saved',
  CAPTURE_TAKEN: 'notnot:capture-taken',
  SIDEBAR_TOGGLED: 'notnot:sidebar-toggled',
  
  // DOM events
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  INPUT: 'input',
  CHANGE: 'change'
};