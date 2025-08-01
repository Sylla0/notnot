# NotNot - Video Learning Assistant Chrome Extension

NotNot is a Chrome extension that enhances your video learning experience by allowing you to capture screenshots, take notes, and transcribe videos in real-time.

## Features

### ✅ MVP Features (Implemented)
- **Video Detection**: Automatically detects videos on YouTube, Vimeo, Coursera, Udemy, and EdX
- **Screenshot Capture**: Capture full frame or select regions with annotations
- **Note Taking**: Rich text editor with markdown support in a convenient sidebar
- **Basic Transcription**: Web Speech API integration for real-time transcription
- **Storage**: Local storage using IndexedDB for offline access
- **Export**: Export notes as Markdown files

### 🚀 Future Enhancements
- Cloud synchronization
- Advanced OCR for text extraction from screenshots
- AI-powered summaries and Q&A
- Code snippet execution
- Multi-language support
- Video clip recording
- Collaboration features

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/notnot.git
cd notnot
```

2. Generate icon files:
```bash
# Create placeholder icons (replace with actual PNG icons)
node assets/icons/generate-icons.js
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `notnot` directory

## Usage

1. **Navigate to a video**: Visit any supported video platform
2. **Video detection**: NotNot will automatically detect the video and show overlay controls
3. **Capture screenshots**: Click the camera icon to capture the current frame
4. **Take notes**: Click the notes icon to open the sidebar editor
5. **Start transcription**: Click the microphone icon to begin voice transcription
6. **Export notes**: Use the export button to save your notes as Markdown

## Project Structure

```
notnot/
├── manifest.json           # Extension configuration
├── background/            # Background service worker
├── content-scripts/       # Scripts injected into web pages
├── sidebar/              # Note-taking sidebar interface
├── popup/                # Extension popup interface
├── shared/               # Shared utilities and constants
└── assets/               # Icons and styles
```

## Development

### Key Technologies
- Chrome Extension Manifest V3
- IndexedDB for local storage
- Web Speech API for transcription
- Canvas API for screenshot capture
- ContentEditable for rich text editing

### Building for Production
1. Minify JavaScript and CSS files
2. Generate proper icon files in PNG format
3. Update manifest version
4. Create a ZIP file for Chrome Web Store submission

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details