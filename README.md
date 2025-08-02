# NotNot - YouTube Video Learning Assistant Chrome Extension

NotNot is a Chrome extension designed specifically for YouTube that helps you capture screenshots, take notes, and organize your video learning experience.

## 🎯 Features

### Current Features (MVP)
- **YouTube Video Detection**: Automatically detects YouTube videos and adds overlay controls
- **Screenshot Capture**: Capture video frames with timestamps
- **Note Taking**: Rich text editor sidebar for taking notes while watching
- **Auto-save**: Notes are automatically saved as you type
- **Capture Gallery**: View and insert captured screenshots into notes
- **Export**: Export notes as Markdown files
- **Dashboard**: View all your notes in one place

### 🚀 Installation

#### Development Mode
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/notnot.git
   cd notnot
   ```

2. Build the extension:
   ```bash
   # Development build (with console logs)
   ./build.sh
   
   # Production build (console logs removed)
   ./build.sh --prod
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

#### From Package
1. Download the latest release
2. Extract the archive
3. Follow step 3 above

## 📖 Usage

1. **Navigate to a YouTube video**
2. **Look for NotNot controls** on the video player:
   - 📷 Camera icon: Capture screenshot
   - 📝 Notes icon: Toggle notes sidebar
3. **Use the extension popup** for quick access to features
4. **Access the dashboard** to view all your notes

### Keyboard Shortcuts
- None currently (planned for future release)

## 🛠️ Development

### Project Structure
```
notnot/
├── manifest.json          # Extension configuration
├── background/           # Background service worker
├── content-scripts/      # YouTube page integration
├── popup/               # Extension popup
├── sidebar/             # Notes sidebar (injected)
├── dashboard/           # All notes view
├── options/             # Settings page
├── assets/              # Icons and styles
└── build.sh            # Build script
```

### Building
```bash
# Development build
./build.sh

# Production build (removes console.log)
./build.sh --prod
```

### Key Technologies
- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks for performance)
- IndexedDB for local storage
- Content scripts for YouTube integration

## 🔍 Troubleshooting

### Extension not working?
1. Make sure you're on a YouTube video page (youtube.com/watch?v=...)
2. Refresh the YouTube page after installing
3. Check Chrome DevTools console for errors

### Notes not saving?
- Notes are saved automatically after 1 second of inactivity
- Check if IndexedDB is enabled in your browser

### Can't see video controls?
- The video must be loaded and ready
- Try refreshing the page
- Make sure you're on youtube.com

## 🚧 Roadmap

### Planned Features
- [ ] Video transcription support
- [ ] AI-powered summaries
- [ ] Cloud synchronization
- [ ] Multiple language support
- [ ] Video clip recording
- [ ] Advanced text formatting
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Export to Notion/Obsidian

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for video learners by video learners
- Inspired by the need for better video learning tools
- Thanks to all contributors and testers

---

**Note**: This extension is not affiliated with YouTube or Google. It's an independent tool designed to enhance your video learning experience.