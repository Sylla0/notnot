// NotNot Capture Handler - Screenshot capture functionality
import { CONSTANTS } from './constants.js';
import { utils } from './utils.js';
import { AreaSelector } from './area-selector.js';

export class CaptureHandler {
  constructor(videoElement, storageManager) {
    this.video = videoElement;
    this.storage = storageManager;
    this.lastCaptureArea = null;
    
    // Load saved capture area
    this.loadCaptureArea();
  }
  
  async loadCaptureArea() {
    try {
      const result = await chrome.storage.local.get(CONSTANTS.STORAGE_KEYS.CAPTURE_AREA);
      this.lastCaptureArea = result[CONSTANTS.STORAGE_KEYS.CAPTURE_AREA] || null;
    } catch (error) {
      console.error('CaptureHandler: Failed to load capture area', error);
    }
  }
  
  async saveCaptureArea(area) {
    this.lastCaptureArea = area;
    try {
      await chrome.storage.local.set({
        [CONSTANTS.STORAGE_KEYS.CAPTURE_AREA]: area
      });
    } catch (error) {
      console.error('CaptureHandler: Failed to save capture area', error);
    }
  }
  
  async capture(showAreaSelector = false) {
    return new Promise((resolve, reject) => {
      // Force area selector if no saved area or explicitly requested
      if (showAreaSelector || !this.lastCaptureArea) {
        const selector = new AreaSelector(this.video, async (area, cancelled) => {
          if (cancelled) {
            resolve(null);
            return;
          }
          
          if (area) {
            await this.saveCaptureArea(area);
          }
          
          const captureData = await this.captureArea(area);
          resolve(captureData);
        });
        selector.start();
      } else {
        // Use last capture area
        this.captureArea(this.lastCaptureArea).then(resolve).catch(reject);
      }
    });
  }
  
  async defineArea() {
    console.log('CaptureHandler: defineArea called');
    console.log('CaptureHandler: video element:', this.video);
    console.log('CaptureHandler: video dimensions:', this.video?.videoWidth, 'x', this.video?.videoHeight);
    
    return new Promise((resolve, reject) => {
      try {
        console.log('CaptureHandler: Creating AreaSelector');
        const selector = new AreaSelector(this.video, async (area, cancelled) => {
          console.log('CaptureHandler: AreaSelector callback called', { area, cancelled });
          
          if (cancelled) {
            this.showToast('영역 선택이 취소되었습니다', 'info');
            resolve(null);
            return;
          }
          
          if (area) {
            await this.saveCaptureArea(area);
            this.showToast('캡처 영역이 설정되었습니다', 'success');
          } else {
            // Full screen selected
            this.resetCaptureArea();
            this.showToast('전체 화면 캡처로 설정되었습니다', 'success');
          }
          
          resolve(area);
        });
        
        console.log('CaptureHandler: Starting AreaSelector');
        selector.start();
        console.log('CaptureHandler: AreaSelector started');
      } catch (error) {
        console.error('CaptureHandler: Error in defineArea', error);
        reject(error);
      }
    });
  }
  
  async captureArea(area = null) {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (area) {
        // Capture specific area
        canvas.width = area.width;
        canvas.height = area.height;
        ctx.drawImage(
          this.video,
          area.x, area.y, area.width, area.height,
          0, 0, area.width, area.height
        );
      } else {
        // Capture full frame
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        ctx.drawImage(this.video, 0, 0);
      }
      
      // Get image data
      let imageData = canvas.toDataURL(
        `image/${CONSTANTS.UI.CAPTURE_FORMAT}`,
        CONSTANTS.UI.CAPTURE_QUALITY
      );
      
      // Compress if needed
      if (imageData.length > CONSTANTS.LIMITS.MAX_IMAGE_SIZE) {
        imageData = await utils.compressImage(imageData, 0.7);
      }
      
      // Create capture object
      const capture = {
        id: utils.generateId(),
        imageData: imageData,
        timestamp: this.video.currentTime,
        videoTimestamp: utils.formatTimestamp(this.video.currentTime),
        dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        area: area,
        createdAt: new Date().toISOString()
      };
      
      return capture;
    } catch (error) {
      console.error('CaptureHandler: Capture failed', error);
      throw error;
    }
  }
  
  resetCaptureArea() {
    this.lastCaptureArea = null;
    chrome.storage.local.remove(CONSTANTS.STORAGE_KEYS.CAPTURE_AREA);
  }
  
  // Toast notification helper
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notnot-toast notnot-toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2147483647;
      animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Remove after delay
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, CONSTANTS.UI.TOAST_DURATION);
  }
}