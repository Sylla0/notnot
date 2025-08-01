import { utils } from '../shared/utils.js';

export class TranscriptionHandler {
  constructor(videoElement) {
    this.video = videoElement;
    this.recognition = null;
    this.isRecording = false;
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.transcriptBuffer = [];
    this.lastTimestamp = 0;
  }

  init() {
    // Check if Web Speech API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('NotNot: Speech recognition not supported');
      return false;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
    return true;
  }

  setupRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US'; // Default language

    this.recognition.onstart = () => {
      console.log('NotNot: Transcription started');
      this.isRecording = true;
    };

    this.recognition.onresult = (event) => {
      this.handleTranscriptionResult(event);
    };

    this.recognition.onerror = (event) => {
      console.error('NotNot: Transcription error', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition after a short delay
        setTimeout(() => {
          if (this.isRecording) {
            this.recognition.start();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      console.log('NotNot: Transcription ended');
      // Restart if still recording
      if (this.isRecording) {
        setTimeout(() => {
          this.recognition.start();
        }, 100);
      }
    };
  }

  start() {
    if (!this.recognition) {
      if (!this.init()) {
        return false;
      }
    }

    this.isRecording = true;
    this.lastTimestamp = this.video.currentTime;
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('NotNot: Failed to start transcription', error);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isRecording) {
      this.isRecording = false;
      this.recognition.stop();
      
      // Process any remaining transcript
      if (this.finalTranscript) {
        this.sendTranscriptUpdate(this.finalTranscript);
        this.finalTranscript = '';
      }
    }
  }

  handleTranscriptionResult(event) {
    this.interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        this.finalTranscript += result[0].transcript + ' ';
        
        // Send update when we have a complete sentence or phrase
        if (this.shouldSendUpdate(this.finalTranscript)) {
          this.sendTranscriptUpdate(this.finalTranscript.trim());
          this.finalTranscript = '';
        }
      } else {
        this.interimTranscript += result[0].transcript;
      }
    }

    // Update UI with interim results
    this.updateInterimDisplay(this.interimTranscript);
  }

  shouldSendUpdate(transcript) {
    // Send update if:
    // 1. Transcript ends with punctuation
    // 2. Transcript is longer than 50 characters
    // 3. More than 5 seconds have passed since last update
    
    const currentTime = this.video.currentTime;
    const timeDiff = currentTime - this.lastTimestamp;
    
    return (
      transcript.match(/[.!?]$/) ||
      transcript.length > 50 ||
      timeDiff > 5
    );
  }

  sendTranscriptUpdate(text) {
    const timestamp = this.video.currentTime;
    
    const transcriptData = {
      id: utils.generateId(),
      timestamp: timestamp,
      text: text,
      videoTime: utils.formatTimestamp(timestamp)
    };

    // Send to sidebar
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT_UPDATE',
      data: transcriptData
    });

    // Update last timestamp
    this.lastTimestamp = timestamp;
    
    // Add to buffer for storage
    this.transcriptBuffer.push(transcriptData);
  }

  updateInterimDisplay(text) {
    // Create or update interim display element
    let display = document.querySelector('.notnot-interim-transcript');
    
    if (!display && text) {
      display = document.createElement('div');
      display.className = 'notnot-interim-transcript';
      display.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        max-width: 600px;
        z-index: 10001;
        pointer-events: none;
      `;
      document.body.appendChild(display);
    }
    
    if (display) {
      if (text) {
        display.textContent = text;
        display.style.display = 'block';
      } else {
        display.style.display = 'none';
      }
    }
  }

  // Get full transcript
  getFullTranscript() {
    return this.transcriptBuffer;
  }

  // Clear transcript
  clearTranscript() {
    this.transcriptBuffer = [];
    this.finalTranscript = '';
    this.interimTranscript = '';
  }

  // Change language
  setLanguage(langCode) {
    this.recognition.lang = langCode;
    
    // Restart recognition if active
    if (this.isRecording) {
      this.stop();
      setTimeout(() => this.start(), 100);
    }
  }
}

// Audio context alternative for better audio capture (future enhancement)
export class AudioTranscriptionHandler extends TranscriptionHandler {
  constructor(videoElement) {
    super(videoElement);
    this.audioContext = null;
    this.mediaStreamSource = null;
  }

  async initAudioCapture() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create media element source from video
      const source = this.audioContext.createMediaElementSource(this.video);
      
      // Connect to destination (speakers)
      source.connect(this.audioContext.destination);
      
      // Create analyzer for audio processing
      const analyzer = this.audioContext.createAnalyser();
      source.connect(analyzer);
      
      return true;
    } catch (error) {
      console.error('NotNot: Failed to initialize audio capture', error);
      return false;
    }
  }
}