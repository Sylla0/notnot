import { CONSTANTS } from '../shared/constants.js';
import { utils } from '../shared/utils.js';

export class CaptureHandler {
  constructor(videoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async captureFrame() {
    // Set canvas dimensions to match video
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    // Draw current video frame to canvas
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Convert to base64
    const imageData = this.canvas.toDataURL('image/jpeg', CONSTANTS.UI.CAPTURE_QUALITY);

    // Create capture object
    const capture = {
      id: utils.generateId(),
      timestamp: this.video.currentTime,
      imageData: imageData,
      videoUrl: window.location.href,
      videoTitle: utils.getVideoTitle(),
      createdAt: new Date().toISOString(),
      annotations: [],
      extractedText: ''
    };

    return capture;
  }

  async captureRegion(x, y, width, height) {
    // First capture full frame
    await this.captureFrame();

    // Create new canvas for region
    const regionCanvas = document.createElement('canvas');
    const regionCtx = regionCanvas.getContext('2d');
    
    regionCanvas.width = width;
    regionCanvas.height = height;

    // Draw region from full capture
    regionCtx.drawImage(
      this.canvas,
      x, y, width, height,
      0, 0, width, height
    );

    return regionCanvas.toDataURL('image/jpeg', CONSTANTS.UI.CAPTURE_QUALITY);
  }

  // Create selection overlay for region capture
  createSelectionOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'notnot-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: ${CONSTANTS.UI.OVERLAY_Z_INDEX + 1};
      cursor: crosshair;
    `;

    const selection = document.createElement('div');
    selection.className = 'notnot-selection';
    selection.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255, 255, 255, 0.1);
      display: none;
    `;

    overlay.appendChild(selection);
    document.body.appendChild(overlay);

    let isSelecting = false;
    let startX, startY;

    overlay.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      selection.style.display = 'block';
      selection.style.left = startX + 'px';
      selection.style.top = startY + 'px';
      selection.style.width = '0px';
      selection.style.height = '0px';
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      const left = Math.min(currentX, startX);
      const top = Math.min(currentY, startY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selection.style.left = left + 'px';
      selection.style.top = top + 'px';
      selection.style.width = width + 'px';
      selection.style.height = height + 'px';
    });

    overlay.addEventListener('mouseup', async (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      const rect = selection.getBoundingClientRect();
      const videoRect = this.video.getBoundingClientRect();

      // Calculate relative position to video
      const relativeX = rect.left - videoRect.left;
      const relativeY = rect.top - videoRect.top;
      
      // Scale to video dimensions
      const scaleX = this.video.videoWidth / videoRect.width;
      const scaleY = this.video.videoHeight / videoRect.height;

      const captureX = relativeX * scaleX;
      const captureY = relativeY * scaleY;
      const captureWidth = rect.width * scaleX;
      const captureHeight = rect.height * scaleY;

      // Capture the selected region
      const regionData = await this.captureRegion(
        captureX, captureY, captureWidth, captureHeight
      );

      // Remove overlay
      overlay.remove();

      // Return capture data
      return {
        id: utils.generateId(),
        timestamp: this.video.currentTime,
        imageData: regionData,
        videoUrl: window.location.href,
        videoTitle: utils.getVideoTitle(),
        createdAt: new Date().toISOString(),
        type: 'region',
        annotations: [],
        extractedText: ''
      };
    });

    // Cancel on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.parentElement) {
        overlay.remove();
      }
    });

    return overlay;
  }
}