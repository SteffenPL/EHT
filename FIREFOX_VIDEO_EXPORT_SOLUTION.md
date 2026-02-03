# Firefox Video Export Solution

## Quick Answer

**Use WebM (VP9) format in Firefox** instead of H.264 or AV1.

## Why H.264 and AV1 Fail in Firefox

Firefox 130+ includes WebCodecs API support, but there are critical bugs:

1. **H.264 is broken**: `VideoEncoder.isConfigSupported()` reports H.264 as supported, but encoding actually fails ([Firefox Bug 1918769](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769))
2. **AV1 is unreliable**: AV1 encoding has issues in Firefox WebCodecs implementation
3. **VP8/VP9 work correctly**: These codecs are properly implemented and tested in Firefox

## Solution: Use WebM (VP9)

1. Open the simulator in Firefox
2. In the Export section, click the format dropdown (currently showing "MP4 (H.264)")
3. Select **"WebM (VP9)"**
4. Click "Record" and run your simulation
5. Click "Stop Recording" to download the video

### Converting WebM to MP4 for PowerPoint

If you need MP4/H.264 for PowerPoint compatibility, you can convert the WebM file using:

**FFmpeg (command line):**
```bash
ffmpeg -i simulation.webm -c:v libx264 -preset medium -crf 23 simulation.mp4
```

**Online Tools:**
- [CloudConvert](https://cloudconvert.com/webm-to-mp4)
- [FreeConvert](https://www.freeconvert.com/webm-to-mp4)

**Desktop Tools:**
- [HandBrake](https://handbrake.fr/) (free, open-source)
- [VLC Media Player](https://www.videolan.org/) (Convert/Save feature)

## Technical Details

### Firefox WebCodecs Support Status

| Codec | Decoding | Encoding | Status |
|-------|----------|----------|--------|
| H.264 | ✅ Works | ❌ Broken | [Known bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769) |
| AV1 | ⚠️  Limited | ⚠️  Limited | Unreliable in Firefox |
| VP8 | ✅ Works | ✅ Works | Fully supported |
| VP9 | ✅ Works | ✅ Works | Fully supported |

### Why the "csp.withgoogle.com" Error?

The error about `csp.withgoogle.com` being blocked by OpaqueResponseBlocking is likely a **secondary error** that occurs when the encoder initialization fails. It's not the root cause - the root cause is Firefox's broken H.264 encoding support.

Opaque Response Blocking (ORB) is a Firefox security feature that blocks certain cross-origin requests. The error you're seeing is probably:
- A browser extension trying to report something
- A cached resource trying to load
- Or an unrelated error that happens to appear at the same time

The important thing is: **the video encoder itself doesn't make any external network requests**. It uses only local browser APIs.

## Browser Recommendations

For optimal video export experience:

| Browser | Recommended Format | Why |
|---------|-------------------|-----|
| **Chrome** | MP4 (H.264) | Best compatibility, hardware acceleration, PowerPoint support |
| **Edge** | MP4 (H.264) | Same as Chrome (Chromium-based) |
| **Firefox** | **WebM (VP9)** | H.264 is broken, VP9 works perfectly |
| **Safari** | MP4 (H.264) | WebM not supported, H.264 works |

## Why Not Just Use Chrome?

You absolutely can! Chrome has the most mature WebCodecs implementation. Firefox users should either:
- **Option A**: Use WebM format in Firefox (works perfectly)
- **Option B**: Switch to Chrome for video export (H.264 works)

Both are valid solutions. Use WebM if you want to stay in Firefox, or use Chrome if you need H.264 directly.

## References

- [WebCodecs API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Firefox WebCodecs Implementation Bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1746557)
- [Firefox H.264 VideoDecoder Bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1918769)
- [Can I Use: WebCodecs](https://caniuse.com/webcodecs)
- [Firefox 130 Release](https://www.phoronix.com/news/Firefox-130)
