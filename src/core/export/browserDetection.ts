/**
 * Browser detection utilities for video export.
 */
import type { VideoFormat } from './videoEncoder';

export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';
  version: number | null;
  isFirefox: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
}

/**
 * Detect the current browser and version.
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent.toLowerCase();

  // Firefox
  if (ua.includes('firefox')) {
    const match = ua.match(/firefox\/(\d+)/);
    const version = match ? parseInt(match[1], 10) : null;
    return {
      name: 'firefox',
      version,
      isFirefox: true,
      isChrome: false,
      isSafari: false,
      isEdge: false,
    };
  }

  // Edge (must check before Chrome since Edge includes 'chrome' in UA)
  if (ua.includes('edg/') || ua.includes('edge/')) {
    const match = ua.match(/edg[e]?\/(\d+)/);
    const version = match ? parseInt(match[1], 10) : null;
    return {
      name: 'edge',
      version,
      isFirefox: false,
      isChrome: false,
      isSafari: false,
      isEdge: true,
    };
  }

  // Chrome (includes Chromium-based browsers)
  if (ua.includes('chrome') && !ua.includes('edg')) {
    const match = ua.match(/chrome\/(\d+)/);
    const version = match ? parseInt(match[1], 10) : null;
    return {
      name: 'chrome',
      version,
      isFirefox: false,
      isChrome: true,
      isSafari: false,
      isEdge: false,
    };
  }

  // Safari
  if (ua.includes('safari') && !ua.includes('chrome')) {
    const match = ua.match(/version\/(\d+)/);
    const version = match ? parseInt(match[1], 10) : null;
    return {
      name: 'safari',
      version,
      isFirefox: false,
      isChrome: false,
      isSafari: true,
      isEdge: false,
    };
  }

  // Other/Unknown
  return {
    name: 'other',
    version: null,
    isFirefox: false,
    isChrome: false,
    isSafari: false,
    isEdge: false,
  };
}

/**
 * Get recommended video format for the current browser.
 */
export function getRecommendedVideoFormat(): VideoFormat {
  const browser = detectBrowser();

  // Firefox: recommend WebM due to H.264 encoding bugs
  if (browser.isFirefox) {
    return 'webm-vp9';
  }

  // Safari: only supports MP4/H.264, not WebM
  if (browser.isSafari) {
    return 'mp4';
  }

  // Chrome/Edge: H.264 works great and has best compatibility
  return 'mp4';
}

/**
 * Get a user-friendly message explaining the recommended format.
 */
export function getFormatRecommendationMessage(): string | null {
  const browser = detectBrowser();

  if (browser.isFirefox) {
    return (
      'Firefox users: We recommend WebM (VP9) format due to known H.264 encoding issues in Firefox. ' +
      'To convert to MP4 later, use: ffmpeg -i video.webm -c:v libx264 -crf 23 video.mp4. ' +
      'If compatibility issues remain, re-encode the file with HandBrake using a standard H.264 preset.'
    );
  }

  if (browser.isSafari && browser.version && browser.version < 16) {
    return (
      'Your Safari version may not support video recording. Please update to Safari 16.4 or later. ' +
      'If compatibility issues remain, re-encode the file with HandBrake using a standard H.264 preset.'
    );
  }

  return null;
}
