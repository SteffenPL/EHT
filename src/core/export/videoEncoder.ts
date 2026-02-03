import {
  Muxer,
  ArrayBufferTarget,
} from 'mp4-muxer';

export interface VideoEncoderOptions {
  width: number;
  height: number;
  frameRate: number;
  bitrate?: number; // bits per second, defaults based on resolution
}

/**
 * MP4 video encoder using WebCodecs API and mp4-muxer.
 * Produces H.264/MP4 files compatible with PowerPoint and most media players.
 */
export class MP4VideoEncoder {
  private encoder: VideoEncoder | null = null;
  private muxer: Muxer<ArrayBufferTarget> | null = null;
  private options: VideoEncoderOptions;
  private frameCount = 0;
  private isFinished = false;
  private encodePromises: Promise<void>[] = [];
  private videoMetadata: any = null; // Store video metadata from first chunk

  constructor(options: VideoEncoderOptions) {
    this.options = options;
  }

  /**
   * Initialize the encoder. Must be called before addFrame.
   */
  async init(): Promise<void> {
    if (this.encoder) {
      throw new Error('Encoder already initialized');
    }

    // Check if WebCodecs API is available
    if (typeof VideoEncoder === 'undefined') {
      throw new Error(
        'WebCodecs API is not available in this browser. ' +
        'Please use Chrome 94+, Safari 16.4+, or Edge 94+.'
      );
    }

    console.log('Browser:', navigator.userAgent);
    console.log('Testing video codec support...');
    console.log('Resolution:', this.options.width, 'x', this.options.height);
    console.log('Frame rate:', this.options.frameRate);

    // Quick test - can we create a VideoEncoder at all?
    try {
      const testEncoder = new VideoEncoder({
        output: () => {},
        error: () => {},
      });
      testEncoder.close();
      console.log('✓ VideoEncoder can be created');
    } catch (err) {
      console.error('✗ Cannot create VideoEncoder:', err);
      throw new Error(
        `Cannot create VideoEncoder: ${err}. WebCodecs API may be disabled or unavailable.`
      );
    }

    // Calculate default bitrate if not provided
    // Rule of thumb: 0.1 bits per pixel per frame for good quality
    const defaultBitrate =
      this.options.bitrate ||
      this.options.width * this.options.height * this.options.frameRate * 0.1;

    // Try codec configurations in order of preference
    // H.264 is most compatible with QuickTime and PowerPoint
    const codecConfigs = [
      // H.264 Baseline Profile - various levels
      {
        codec: 'avc1.42001e', // Baseline Level 3.0
        muxerCodec: 'avc',
        name: 'H.264 Baseline (Level 3.0)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
      {
        codec: 'avc1.42001f', // Baseline Level 3.1
        muxerCodec: 'avc',
        name: 'H.264 Baseline (Level 3.1)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
      {
        codec: 'avc1.4d001f', // Main Profile Level 3.1
        muxerCodec: 'avc',
        name: 'H.264 Main (Level 3.1)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
      {
        codec: 'avc1.640028', // High Profile Level 4.0
        muxerCodec: 'avc',
        name: 'H.264 High (Level 4.0)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
      // Try software encoding as fallback
      {
        codec: 'avc1.42001e',
        muxerCodec: 'avc',
        name: 'H.264 Baseline (Software)',
        hardwareAcceleration: 'prefer-software' as const,
      },
      // Non-H.264 fallbacks (not QuickTime compatible)
      {
        codec: 'vp09.00.10.08', // VP9 Profile 0
        muxerCodec: 'vp9',
        name: 'VP9 (not QuickTime compatible)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
      {
        codec: 'vp8', // VP8
        muxerCodec: 'vp8',
        name: 'VP8 (not QuickTime compatible)',
        hardwareAcceleration: 'prefer-hardware' as const,
      },
    ];

    let selectedConfig: VideoEncoderConfig | null = null;
    let selectedMuxerCodec: string | null = null;
    let selectedName = '';

    // Try each codec until we find one that's supported
    for (const codecConfig of codecConfigs) {
      // Try with full config first
      let config: VideoEncoderConfig = {
        codec: codecConfig.codec,
        width: this.options.width,
        height: this.options.height,
        bitrate: defaultBitrate,
        framerate: this.options.frameRate,
        hardwareAcceleration: codecConfig.hardwareAcceleration,
        latencyMode: 'quality',
      };

      try {
        let support = await VideoEncoder.isConfigSupported(config);

        // If full config not supported, try minimal config
        if (!support.supported) {
          console.log(`✗ ${codecConfig.name} (full config) not supported, trying minimal...`);
          config = {
            codec: codecConfig.codec,
            width: this.options.width,
            height: this.options.height,
            bitrate: defaultBitrate,
            framerate: this.options.frameRate,
          };
          support = await VideoEncoder.isConfigSupported(config);
        }

        if (support.supported) {
          selectedConfig = config;
          selectedMuxerCodec = codecConfig.muxerCodec;
          selectedName = codecConfig.name;
          console.log(`✓ Using ${selectedName} codec for video encoding`);
          console.log('  Config:', config);
          break;
        } else {
          console.log(`✗ ${codecConfig.name} not supported (config: ${JSON.stringify(config)})`);
        }
      } catch (err) {
        console.log(`✗ ${codecConfig.name} threw error:`, err);
      }
    }

    if (!selectedConfig || !selectedMuxerCodec) {
      const triedCodecs = codecConfigs.map(c => c.name).join(', ');
      throw new Error(
        `No supported video codec found. Tried: ${triedCodecs}\n\n` +
        'Possible causes:\n' +
        '• Browser version too old (need Chrome 94+, Safari 16.4+, Edge 94+)\n' +
        '• Hardware encoding disabled in browser settings\n' +
        '• Running in an unsupported environment (iframe, extension, etc.)\n\n' +
        `Browser: ${navigator.userAgent}`
      );
    }

    // Warn if using non-H.264 codec
    if (selectedMuxerCodec !== 'avc') {
      console.warn(
        `⚠️  Using ${selectedName} - output may not be compatible with QuickTime or PowerPoint. ` +
        `H.264 encoding is unavailable on this system.`
      );
    }

    // Create muxer with selected codec
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: selectedMuxerCodec as any,
        width: this.options.width,
        height: this.options.height,
      },
      fastStart: 'in-memory',
      // Automatically offset timestamps so first frame is at 0
      firstTimestampBehavior: 'offset',
    });

    // Create VideoEncoder
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (this.muxer) {
          // Store metadata from first chunk (contains decoderConfig)
          if (meta?.decoderConfig && !this.videoMetadata) {
            this.videoMetadata = meta;
            console.log('Captured video metadata:', meta);
          }

          // Always use stored metadata if available
          const metadataToUse = this.videoMetadata || meta;

          try {
            this.muxer.addVideoChunk(chunk, metadataToUse);
          } catch (err) {
            console.error('Failed to add video chunk to muxer:', err);
            console.error('Chunk:', chunk);
            console.error('Metadata:', metadataToUse);
            throw err;
          }
        }
      },
      error: (error) => {
        console.error('VideoEncoder error:', error);
        throw error;
      },
    });

    this.encoder.configure(selectedConfig);
  }

  /**
   * Add a frame to the video from a canvas element.
   * @param canvas The canvas to capture
   * @param timestamp Timestamp in milliseconds
   */
  async addFrame(canvas: HTMLCanvasElement, timestamp: number): Promise<void> {
    if (!this.encoder || !this.muxer) {
      throw new Error('Encoder not initialized. Call init() first.');
    }

    if (this.isFinished) {
      throw new Error('Cannot add frames after finish() has been called');
    }

    // Create VideoFrame from canvas
    const frame = new VideoFrame(canvas, {
      timestamp: timestamp * 1000, // Convert to microseconds
    });

    // Encode frame
    const encodePromise = new Promise<void>((resolve, reject) => {
      try {
        const keyFrame = this.frameCount % (this.options.frameRate * 2) === 0; // Keyframe every 2 seconds
        this.encoder!.encode(frame, { keyFrame });
        frame.close(); // Important: close frame to free memory
        resolve();
      } catch (error) {
        frame.close();
        reject(error);
      }
    });

    this.encodePromises.push(encodePromise);
    this.frameCount++;

    // Wait for encode to complete
    await encodePromise;
  }

  /**
   * Finalize the video and return the MP4 blob.
   * After calling this, the encoder cannot be reused.
   */
  async finish(): Promise<Blob> {
    if (!this.encoder || !this.muxer) {
      throw new Error('Encoder not initialized');
    }

    if (this.isFinished) {
      throw new Error('finish() has already been called');
    }

    this.isFinished = true;

    // Wait for all pending encodes
    await Promise.all(this.encodePromises);

    // Flush encoder
    await this.encoder.flush();

    // Finalize muxer
    this.muxer.finalize();

    // Get the MP4 data
    const target = this.muxer.target as ArrayBufferTarget;
    const buffer = target.buffer;

    // Clean up
    this.encoder.close();
    this.encoder = null;
    this.muxer = null;
    this.videoMetadata = null;

    // Return as blob
    return new Blob([buffer], { type: 'video/mp4' });
  }

  /**
   * Get the number of frames encoded so far.
   */
  getFrameCount(): number {
    return this.frameCount;
  }
}

/**
 * Check if MP4 encoding is supported in the current browser.
 * Requires WebCodecs API (Chrome 94+, Safari 16.4+, Edge 94+).
 */
export async function isMP4Supported(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') {
    return false;
  }

  try {
    // Try to find at least one supported codec
    const testCodecs = [
      'avc1.42001f', // H.264
      'avc1.42001e', // H.264 lower level
      'vp09.00.10.08', // VP9
      'vp8', // VP8
    ];

    for (const codec of testCodecs) {
      const config: VideoEncoderConfig = {
        codec,
        width: 640,
        height: 480,
        bitrate: 1000000,
        framerate: 30,
      };

      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get diagnostic information about codec support.
 * Useful for debugging compatibility issues.
 */
export async function getCodecSupportInfo(): Promise<{
  h264Supported: boolean;
  supportedCodecs: string[];
  browser: string;
}> {
  const supportedCodecs: string[] = [];
  let h264Supported = false;

  const testCodecs = [
    { codec: 'avc1.42001e', name: 'H.264 Baseline 3.0' },
    { codec: 'avc1.42001f', name: 'H.264 Baseline 3.1' },
    { codec: 'avc1.4d001f', name: 'H.264 Main 3.1' },
    { codec: 'avc1.640028', name: 'H.264 High 4.0' },
    { codec: 'vp09.00.10.08', name: 'VP9' },
    { codec: 'vp8', name: 'VP8' },
  ];

  for (const { codec, name } of testCodecs) {
    try {
      const config: VideoEncoderConfig = {
        codec,
        width: 1920,
        height: 1080,
        bitrate: 5000000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware',
      };

      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) {
        supportedCodecs.push(name);
        if (codec.startsWith('avc1')) {
          h264Supported = true;
        }
      }
    } catch {
      // Codec not supported
    }
  }

  const browser = navigator.userAgent;

  return {
    h264Supported,
    supportedCodecs,
    browser,
  };
}
