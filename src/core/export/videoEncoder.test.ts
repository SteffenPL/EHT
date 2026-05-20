import { describe, expect, it } from 'vitest';
import { getVideoFormatInfo, type VideoFormat } from './videoEncoder';

describe('getVideoFormatInfo', () => {
  it('returns correct extension and mime for legacy mp4 formats', () => {
    const mp4 = getVideoFormatInfo('mp4');
    const mp4av1 = getVideoFormatInfo('mp4-av1');

    expect(mp4).toEqual({ extension: 'mp4', mimeType: 'video/mp4' });
    expect(mp4av1).toEqual({ extension: 'mp4', mimeType: 'video/mp4' });
  });

  it('returns correct extension and mime for webm formats', () => {
    const variants: Array<VideoFormat> = ['webm', 'webm-vp9', 'webm-vp8'];

    for (const format of variants) {
      const info = getVideoFormatInfo(format);
      expect(info).toEqual({ extension: 'webm', mimeType: 'video/webm' });
    }
  });
});
