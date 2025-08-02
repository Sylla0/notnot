# NotNot Screenshot Capture Debug Guide

## Debug Steps to Test Screenshot Capture

1. **Build and reload the extension:**
   ```bash
   ./build.sh
   ```
   Then reload the extension in Chrome.

2. **Open a YouTube video** and open the Developer Console (F12)

3. **Click the camera icon** on the video overlay or use the extension popup

4. **Check the console logs** for the following debug output:

   - Video element details
   - Canvas dimensions
   - Image data creation
   - IndexedDB storage
   - Sidebar display

## What to Look For

### Success Indicators:
- "NotNot: Frame captured successfully" with image size > 1000
- "NotNot: Capture saved to IndexedDB successfully"
- "NotNot: Capture displayed successfully"

### Common Issues:

1. **Canvas Security Error**: 
   - Look for: "Tainted canvases may not be exported"
   - Solution: This is a CORS issue. YouTube videos should work, but some may be restricted.

2. **Video Not Ready**:
   - Look for: "Video dimensions not available"
   - Solution: Wait for video to fully load before capturing

3. **IndexedDB Error**:
   - Look for: Error messages about IndexedDB
   - Solution: Check browser storage permissions

4. **Display Issues**:
   - Check if captures tab shows the thumbnails
   - Verify image data starts with "data:image/jpeg;base64,"

## Quick Test Script

Paste this in the console to test capture directly:
```javascript
// Test if video is ready
const video = document.querySelector('video');
console.log('Video ready:', video?.videoWidth, 'x', video?.videoHeight);

// Test canvas capture
if (video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const data = canvas.toDataURL('image/jpeg', 0.92);
  console.log('Image data length:', data.length);
  console.log('First 50 chars:', data.substring(0, 50));
}
```