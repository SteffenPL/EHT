# MP4 Movie Export & Batch Extended Data Export - Implementation Summary

## Overview

Successfully implemented two major features:
1. **MP4 Movie Export** - Replaced WebM with PowerPoint-compatible MP4 format
2. **Batch Extended Export** - Export screenshots, movies, and TOML files for batch runs as a ZIP archive

## Implementation Details

### Phase 1: MP4 Encoder ✓

**Files Created:**
- `src/core/export/videoEncoder.ts` - MP4 video encoder using mp4-muxer and WebCodecs API
  - `MP4VideoEncoder` class with init, addFrame, and finish methods
  - `isMP4Supported()` function to check browser support
  - Uses H.264 codec (avc1.42001f) for maximum compatibility
  - Automatic bitrate calculation (0.1 bits per pixel per frame)
  - Keyframes every 2 seconds for seek performance

**Files Modified:**
- `src/components/simulation/SimulationCanvas.tsx`
  - Replaced MediaRecorder with MP4VideoEncoder
  - Added `captureFrame()` method to ref interface
  - Automatic frame capture during rendering when recording

- `src/components/simulation/SingleSimulationTab.tsx`
  - Updated `handleSaveMovie()` to use async recording start
  - Changed output filename from `.webm` to `.mp4`

**Dependencies Added:**
- `mp4-muxer@^5.1.0` (~50KB) - H.264 muxing

### Phase 2: Offscreen Rendering ✓

**Files Created:**
- `src/core/export/offscreenRenderer.ts` - Headless renderer wrapper
  - Uses OffscreenCanvas when available (modern browsers)
  - Falls back to hidden HTMLCanvasElement for compatibility
  - Supports screenshot capture via `getScreenshot()` method
  - Provides canvas access for video encoding

**Files Modified:**
- `src/rendering/SimulationRenderer.ts`
  - Updated `init()` to accept both HTMLCanvasElement and OffscreenCanvas
  - Added safety check for `window.devicePixelRatio` (for worker compatibility)

### Phase 3: Batch Export Core ✓

**Files Created:**
- `src/core/export/zipBuilder.ts` - ZIP archive builder using jszip
  - Simple API: `addFile(path, content)` and `generate()`
  - Uses DEFLATE compression (level 6 for balanced performance)

- `src/core/batch/exportRunner.ts` - Main batch export orchestrator
  - Runs simulations sequentially on main thread with rendering
  - Captures screenshots at time sample points
  - Optionally records full MP4 movies
  - Exports TOML parameter files for each run
  - Packages everything as a single ZIP file
  - Progress tracking with phase indicators (initializing, simulating, encoding, packaging)
  - Cancellation support via AbortSignal

**Dependencies Added:**
- `jszip@^3.10.1` (~100KB) - ZIP creation

### Phase 4: UI Integration ✓

**Files Created:**
- `src/components/batch/ExtendedExportPanel.tsx` - Configuration UI
  - Toggle for movie export
  - Resolution inputs (width × height)
  - Frame rate selection (24/30/60 FPS)
  - Export button with Film icon

- `src/components/batch/ExportProgressModal.tsx` - Progress modal
  - Phase indicator (initializing/simulating/encoding/packaging)
  - Progress bar with percentage
  - Current run / total runs display
  - Current parameter configuration display
  - Cancel button

**Files Modified:**
- `src/components/batch/BatchTab.tsx`
  - Added extended export state management
  - Added `handleExtendedExport()` and `handleCancelExport()` handlers
  - Integrated ExtendedExportPanel into UI
  - Integrated ExportProgressModal with conditional rendering
  - Uses AbortController for cancellation

- `src/components/batch/index.ts`
  - Added exports for new components

## ZIP Output Structure

```
batch_export_YYYYMMDD_HHMMSS.zip
├── config.toml                    # Master config with parameter ranges
├── run_001/
│   ├── params.toml               # Exact parameters for this run
│   ├── screenshots/
│   │   ├── t_000.00h.png
│   │   ├── t_012.00h.png
│   │   └── t_048.00h.png
│   └── movie.mp4                 # (optional)
├── run_002/
│   └── ...
```

## Browser Support

- **MP4 Export**: Chrome 94+, Safari 15.4+, Edge 94+ (WebCodecs API)
- **OffscreenCanvas**: Chrome 69+, Safari 12+, Edge 79+
- **Fallback**: Hidden HTMLCanvasElement for older browsers

## Key Features

1. **PowerPoint-Compatible**: MP4 files use H.264 codec, fully compatible with PowerPoint
2. **Frame-Based Capture**: Explicit frame capture ensures consistent timing regardless of render performance
3. **Sequential Processing**: Batch export runs on main thread to access canvas/WebGL
4. **Memory Efficient**: Processes one run at a time, streams frames to encoder
5. **Progress Tracking**: Real-time progress with phase indicators and percentage
6. **Cancellable**: Users can cancel long-running exports
7. **Configurable**: Resolution and frame rate are user-configurable
8. **Complete Archive**: Single ZIP contains all artifacts (screenshots, movies, parameter files)

## Testing Recommendations

1. **Single MP4 Export**:
   - Record a simulation
   - Download MP4
   - Verify it opens in PowerPoint

2. **Batch Export**:
   - Run a batch with 2-3 parameter configs
   - Verify ZIP contains correct folder structure
   - Verify PNGs at expected times
   - Verify playable MP4 movies
   - Verify TOML parameter files

3. **Progress Tracking**:
   - Verify progress bar updates smoothly
   - Verify phase transitions

4. **Cancellation**:
   - Cancel during export
   - Verify cleanup and no memory leaks

## Notes

- The `mp4-muxer` package shows a deprecation warning suggesting migration to "Mediabunny". This can be addressed in a future update if needed.
- Export runs on the main thread because workers cannot access canvas/WebGL. This is intentional and necessary for rendering.
- The implementation follows the separation of core and UI architecture of the EHT simulator.
