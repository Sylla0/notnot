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
      cursor: crosshair;
      user-select: none;
    `;
    
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
    
    this.overlay.appendChild(this.selection);
    this.overlay.appendChild(this.dimensionDisplay);
    document.body.appendChild(this.overlay);
    
    // Add event listeners
    this.overlay.addEventListener('mousedown', this.handleMouseDown);
    this.overlay.addEventListener('mousemove', this.handleMouseMove);
    this.overlay.addEventListener('mouseup', this.handleMouseUp);
    
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
  }
}