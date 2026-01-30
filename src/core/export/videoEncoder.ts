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

    // Calculate default bitrate if not provided
    // Rule of thumb: 0.1 bits per pixel per frame for good quality
    const defaultBitrate =
      this.options.bitrate ||
      this.options.width * this.options.height * this.options.frameRate * 0.1;

    // Create muxer
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: this.options.width,
        height: this.options.height,
      },
      fastStart: 'in-memory', // Enable fast start for better streaming
    });

    // Create VideoEncoder
    this.encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk, meta) => {
        if (this.muxer) {
          this.muxer.addVideoChunk(chunk, meta);
        }
      },
      error: (error) => {
        console.error('VideoEncoder error:', error);
        throw error;
      },
    });

    // Configure encoder for H.264
    const config: VideoEncoderConfig = {
      codec: 'avc1.42001f', // H.264 Baseline Profile Level 3.1
      width: this.options.width,
      height: this.options.height,
      bitrate: defaultBitrate,
      framerate: this.options.frameRate,
      latencyMode: 'quality', // Prioritize quality over speed
    };

    // Check if configuration is supported
    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error('Video encoding configuration not supported');
    }

    this.encoder.configure(config);
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
export function isMP4Supported(): boolean {
  if (typeof VideoEncoder === 'undefined') {
    return false;
  }

  try {
    // Check if we can create a VideoEncoder
    const testEncoder = new VideoEncoder({
      output: () => {},
      error: () => {},
    });
    testEncoder.close();
    return true;
  } catch {
    return false;
  }
}
