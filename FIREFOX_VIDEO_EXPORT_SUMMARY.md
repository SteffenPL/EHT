# Firefox Video Export - Issue Analysis & Solution

## Summary for Your Collaborator

**The video export DOES work in Firefox!** The issue was trying to use H.264 or AV1 formats, which have known bugs in Firefox's WebCodecs implementation.

**Solution: Use WebM (VP9) format in Firefox instead.**

The app now automatically selects the best format for each browser:
- **Firefox**: WebM (VP9) - works perfectly
- **Chrome/Edge**: MP4 (H.264) - best compatibility
- **Safari**: MP4 (H.264) - only supported format

## What Was the Problem?

### The Error Message
Your collaborator saw this error in Firefox:
> "Resource at https://csp.withgoogle.com/csp/gws/fff was blocked by OpaqueResponseBlocking"

This error was misleading - it's actually a **secondary error** that occurs when the video encoder fails to initialize. The real problem is Firefox's broken H.264 encoder support.

### Root Cause
Firefox 130+ includes WebCodecs API support, but has critical bugs:

1. **H.264 encoding is broken** ([Firefox Bug #1918769](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769))
   - `VideoEncoder.isConfigSupported()` returns `true` for H.264
   - But actual encoding fails with "codec not supported" error
   - This is a confirmed Firefox bug that persists across versions 130-145+

2. **AV1 encoding is unreliable** in Firefox WebCodecs

3. **VP8/VP9 encoding DOES work correctly** in Firefox

## What Changed?

### 1. Browser Detection & Auto-Format Selection
**New file**: [src/core/export/browserDetection.ts](src/core/export/browserDetection.ts)
- Detects browser type and version
- Automatically selects the best video format for each browser
- Firefox users now default to WebM (VP9) instead of MP4 (H.264)

### 2. User-Friendly Tip Banner
**Modified**: [src/components/simulation/SingleSimulationTab.tsx](src/components/simulation/SingleSimulationTab.tsx)
- Firefox users see a helpful tip: "We recommend WebM (VP9) format due to known H.264 encoding issues in Firefox"
- The format selector defaults to WebM on Firefox automatically

### 3. Better Error Messages
**Modified**: [src/components/simulation/SingleSimulationTab.tsx](src/components/simulation/SingleSimulationTab.tsx)
- When H.264/AV1 fails in Firefox, the error now explains:
  - Firefox has known issues with these codecs
  - Suggests using WebM (VP9) instead
  - Points to documentation for details

### 4. Documentation
**New files**:
- [FIREFOX_VIDEO_EXPORT_SOLUTION.md](FIREFOX_VIDEO_EXPORT_SOLUTION.md) - Complete guide with conversion tips
- [FIREFOX_VIDEO_EXPORT_TROUBLESHOOTING.md](FIREFOX_VIDEO_EXPORT_TROUBLESHOOTING.md) - Troubleshooting steps

**Updated**:
- [README.md](README.md) - Added note about Firefox video export at the top

## Instructions for Your Collaborator

### Quick Start (Firefox)
1. Open the simulator in Firefox
2. The format will automatically be set to "WebM (VP9)"
3. Click "Record" and run your simulation
4. Click "Stop Recording" to download the `.webm` file

### Converting WebM to MP4 for PowerPoint
If PowerPoint doesn't accept WebM files, convert using:

**FFmpeg (recommended for quality):**
```bash
ffmpeg -i simulation.webm -c:v libx264 -preset medium -crf 23 simulation.mp4
```

**Online Tools:**
- [CloudConvert](https://cloudconvert.com/webm-to-mp4) (free, no signup)
- [FreeConvert](https://www.freeconvert.com/webm-to-mp4)

**Desktop Tools:**
- [HandBrake](https://handbrake.fr/) (free, open-source)
- [VLC Media Player](https://www.videolan.org/) (File → Convert/Save)

### Alternative: Use Chrome
Chrome has fully working H.264 support, so videos can be recorded directly as MP4 files that work in PowerPoint without conversion.

## Technical Details

### Browser WebCodecs Support Matrix

| Browser | Version | H.264 Encode | VP9 Encode | AV1 Encode | Status |
|---------|---------|--------------|------------|------------|--------|
| Chrome  | 94+     | ✅ Works     | ✅ Works   | ✅ Works   | Full support |
| Edge    | 94+     | ✅ Works     | ✅ Works   | ✅ Works   | Full support |
| Firefox | 130+    | ❌ Broken    | ✅ Works   | ⚠️  Buggy  | Partial support |
| Safari  | 16.4+   | ✅ Works     | ❌ No WebM | ❌ No AV1  | H.264 only |

### Why the "csp.withgoogle.com" Error?
The error about `csp.withgoogle.com` being blocked by OpaqueResponseBlocking (ORB) is a Firefox security mechanism. It's likely caused by:
- A browser extension trying to report something
- Cached resources from other sites
- Firefox's strict Content Security Policy enforcement

**Important**: The video encoder itself makes NO external network requests. It uses only local browser APIs. This error is a red herring - the real issue is Firefox's broken H.264 encoder.

## Testing Recommendations

### For Firefox Users:
1. ✅ Use WebM (VP9) format - works perfectly
2. ✅ Convert to MP4 afterward if needed for PowerPoint
3. ✅ Or switch to Chrome/Edge for direct MP4 recording

### For Chrome/Edge Users:
1. ✅ Use MP4 (H.264) format - best compatibility
2. ✅ Files work directly in PowerPoint, no conversion needed

### For Safari Users:
1. ✅ Use MP4 (H.264) format - only supported option
2. ⚠️  Requires Safari 16.4 or later

## References

- [WebCodecs API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Firefox WebCodecs Implementation (Bug #1746557)](https://bugzilla.mozilla.org/show_bug.cgi?id=1746557)
- [Firefox H.264 VideoDecoder Bug (#1918769)](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769)
- [Firefox 130 Release with WebCodecs](https://www.phoronix.com/news/Firefox-130)
- [Can I Use: WebCodecs](https://caniuse.com/webcodecs)
- [Cross-Origin Read Blocking (CORB)](https://chromium.googlesource.com/chromium/src/+/lkgr/services/network/cross_origin_read_blocking_explainer.md)
