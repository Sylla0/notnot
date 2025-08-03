// NotNot Area Selector - Capture area selection functionality
import { CSS_CLASSES } from './constants.js';

export class AreaSelector {
  constructor(videoElement, onSelect) {
    this.video = videoElement;
    this.onSelect = onSelect;
    this.overlay = null;
    this.selection = null;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    
    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }
  
  start() {
    console.log('AreaSelector: start() called');
    console.log('AreaSelector: video element:', this.video);
    console.log('AreaSelector: document.body exists?', !!document.body);
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = CSS_CLASSES.CAPTURE_AREA;
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483646;
      cursor: none;
      user-select: none;
    `;
    
    console.log('AreaSelector: overlay created');
    
    // Create selection box
    this.selection = document.createElement('div');
    this.selection.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255, 255, 255, 0.1);
      display: none;
      pointer-events: none;
    `;
    
    // Add dimension display
    this.dimensionDisplay = document.createElement('div');
    this.dimensionDisplay.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
      display: none;
      pointer-events: none;
    `;
    
    // Create custom crosshair cursor
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
    `;
    this.crosshair.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer circle -->
        <circle cx="25" cy="25" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
        <circle cx="25" cy="25" r="20" fill="none" stroke="black" stroke-width="2" stroke-dasharray="2 2" opacity="0.8"/>
        
        <!-- Crosshair lines -->
        <line x1="25" y1="5" x2="25" y2="20" stroke="white" stroke-width="3"/>
        <line x1="25" y1="5" x2="25" y2="20" stroke="black" stroke-width="1"/>
        
        <line x1="25" y1="30" x2="25" y2="45" stroke="white" stroke-width="3"/>
        <line x1="25" y1="30" x2="25" y2="45" stroke="black" stroke-width="1"/>
        
        <line x1="5" y1="25" x2="20" y2="25" stroke="white" stroke-width="3"/>
        <line x1="5" y1="25" x2="20" y2="25" stroke="black" stroke-width="1"/>
        
        <line x1="30" y1="25" x2="45" y2="25" stroke="white" stroke-width="3"/>
        <line x1="30" y1="25" x2="45" y2="25" stroke="black" stroke-width="1"/>
        
        <!-- Center dot -->
        <circle cx="25" cy="25" r="3" fill="white" opacity="0.9"/>
        <circle cx="25" cy="25" r="2" fill="red"/>
      </svg>
    `;
    
    this.overlay.appendChild(this.selection);
    this.overlay.appendChild(this.dimensionDisplay);
    this.overlay.appendChild(this.crosshair);
    
    console.log('AreaSelector: Appending overlay to document.body');
    try {
      document.body.appendChild(this.overlay);
      console.log('AreaSelector: Overlay appended successfully');
      console.log('AreaSelector: Overlay in DOM?', document.body.contains(this.overlay));
      console.log('AreaSelector: Overlay offsetWidth:', this.overlay.offsetWidth);
      console.log('AreaSelector: Overlay offsetHeight:', this.overlay.offsetHeight);
    } catch (error) {
      console.error('AreaSelector: Failed to append overlay', error);
    }
    
    // Add event listeners
    this.overlay.addEventListener('mousedown', this.handleMouseDown);
    this.overlay.addEventListener('mousemove', this.handleMouseMove);
    this.overlay.addEventListener('mouseup', this.handleMouseUp);
    this.overlay.addEventListener('mouseenter', () => {
      this.crosshair.style.display = 'block';
    });
    this.overlay.addEventListener('mouseleave', () => {
      this.crosshair.style.display = 'none';
    });
    
    // Touch support
    this.overlay.addEventListener('touchstart', this.handleTouchStart);
    this.overlay.addEventListener('touchmove', this.handleTouchMove);
    this.overlay.addEventListener('touchend', this.handleTouchEnd);
    
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Add instruction text
    const instruction = document.createElement('div');
    instruction.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 16px;
      background: rgba(0, 0, 0, 0.8);
      padding: 12px 24px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    `;
    instruction.textContent = '드래그하여 캡처 영역을 선택하세요 (ESC로 취소)';
    this.overlay.appendChild(instruction);
  }
  
  handleMouseDown(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selection.style.display = 'block';
    this.dimensionDisplay.style.display = 'block';
    this.updateSelection(e.clientX, e.clientY);
  }
  
  handleMouseMove(e) {
    // Update crosshair position
    this.crosshair.style.left = (e.clientX - 25) + 'px';
    this.crosshair.style.top = (e.clientY - 25) + 'px';
    
    if (!this.isSelecting) return;
    this.updateSelection(e.clientX, e.clientY);
  }
  
  handleMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    this.processSelection();
  }
  
  // Touch event handlers
  handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }
  
  handleTouchMove(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp({});
  }
  
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.cleanup();
      this.onSelect(null, true); // Cancelled
    }
  }
  
  updateSelection(currentX, currentY) {
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);
    
    this.selection.style.left = left + 'px';
    this.selection.style.top = top + 'px';
    this.selection.style.width = width + 'px';
    this.selection.style.height = height + 'px';
    
    // Update dimension display
    this.dimensionDisplay.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    this.dimensionDisplay.style.left = (left + width + 10) + 'px';
    this.dimensionDisplay.style.top = top + 'px';
  }
  
  processSelection() {
    const rect = this.selection.getBoundingClientRect();
    const videoRect = this.video.getBoundingClientRect();
    
    // Calculate selection relative to video
    const selection = {
      x: Math.max(0, rect.left - videoRect.left),
      y: Math.max(0, rect.top - videoRect.top),
      width: Math.min(rect.width, videoRect.width - (rect.left - videoRect.left)),
      height: Math.min(rect.height, videoRect.height - (rect.top - videoRect.top))
    };
    
    // Scale to actual video dimensions
    const scaleX = this.video.videoWidth / videoRect.width;
    const scaleY = this.video.videoHeight / videoRect.height;
    
    const scaledSelection = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      width: Math.round(selection.width * scaleX),
      height: Math.round(selection.height * scaleY)
    };
    
    this.cleanup();
    
    // Call callback with selection
    if (selection.width > 10 && selection.height > 10) {
      this.onSelect(scaledSelection);
    } else {
      // If selection too small, capture full frame
      this.onSelect(null);
    }
  }
  
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Clear references
    this.selection = null;
    this.dimensionDisplay = null;
    this.crosshair = null;
  }
}