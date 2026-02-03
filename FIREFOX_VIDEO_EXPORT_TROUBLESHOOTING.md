# Firefox Video Export Troubleshooting

## Issue
Firefox blocks video export with error: "Resource at https://csp.withgoogle.com/csp/gws/fff was blocked by OpaqueResponseBlocking"

## Quick Fixes (Try in order)

### 1. Test in Private Window
Open a **private/incognito window** in Firefox and try exporting again. This disables most extensions and uses fresh cache.

```
Firefox → File → New Private Window
```

If this works, the issue is likely an extension or cached data.

### 2. Disable Extensions Temporarily
1. Open Firefox menu → Add-ons and themes (`Ctrl+Shift+A`)
2. Disable all extensions temporarily
3. Reload the simulator page
4. Try video export again

Common culprits:
- Ad blockers (uBlock Origin, AdBlock Plus, etc.)
- Privacy extensions (Privacy Badger, NoScript, etc.)
- Security extensions

### 3. Clear Firefox Cache
1. Open Firefox menu → Settings → Privacy & Security
2. Scroll to "Cookies and Site Data"
3. Click "Clear Data..."
4. Check both "Cookies" and "Cached Web Content"
5. Click "Clear"
6. Reload the simulator page

### 4. Check Firefox CSP Settings
Firefox may have strict Content Security Policy settings. Try:

1. Type `about:config` in address bar
2. Accept the warning
3. Search for: `browser.opaqueResponseBlocking`
4. If it exists and is set to `true`, you could try setting it to `false` (not recommended for general browsing)
5. Restart Firefox

**Warning:** Disabling ORB reduces security. Only do this for testing.

### 5. Update Firefox
Make sure you're running the latest Firefox version:
- Firefox → Help → About Firefox
- Update if available

## Why This Happens

The video encoder uses the **WebCodecs API** (native browser feature) to encode video locally. It doesn't make any external network requests. The "csp.withgoogle.com" error is from Firefox's **Opaque Response Blocking (ORB)** mechanism, which is likely triggered by:

1. A browser extension making external requests
2. Cached resources from other sites
3. CSP violation reporting (some sites report violations to Google's CSP endpoint)

This is **not** a bug in the simulator - the video encoder only uses local APIs and creates video entirely in the browser.

## Working Solutions

### Option A: Use Chrome
As you noted, Chrome works perfectly. H.264/MP4 format is fully compatible with PowerPoint.

### Option B: Use Firefox Private Window
Private window in Firefox should work since it disables extensions.

### Option C: Identify and Disable Problem Extension
Use Firefox's built-in debugging:
1. Open Developer Tools (`F12`)
2. Go to Console tab
3. Try video export
4. Look for which extension is making the blocked request
5. Disable that specific extension

## Technical Details

The error message indicates Firefox is blocking a cross-origin request to a Google CSP reporting endpoint. This is likely from:
- A browser extension reporting policy violations
- A cached resource trying to load
- Firefox's strict security policies interfering with legitimate local operations

The video encoder:
- ✅ Uses only browser-native APIs (WebCodecs, Canvas, Blob)
- ✅ Creates video entirely locally (no network requests)
- ✅ Works in all modern browsers with WebCodecs support
- ✅ Produces standard H.264/MP4 files compatible with PowerPoint

## Still Not Working?

If none of the above helps, please provide:
1. Firefox version (Help → About Firefox)
2. List of installed extensions
3. Full console error output (F12 → Console tab)
4. Whether private window works or not

This will help identify the specific cause.
