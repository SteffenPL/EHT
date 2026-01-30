import JSZip from 'jszip';

/**
 * Utility for building ZIP archives with files and directories.
 * Uses JSZip library for cross-browser compatibility.
 */
export class ZipBuilder {
  private zip: JSZip;

  constructor() {
    this.zip = new JSZip();
  }

  /**
   * Add a file to the ZIP archive.
   * @param path Path within the ZIP (e.g., "run_001/params.toml")
   * @param content File content (Blob, string, or ArrayBuffer)
   */
  addFile(path: string, content: Blob | string | ArrayBuffer): void {
    this.zip.file(path, content);
  }

  /**
   * Generate the ZIP file as a Blob.
   * @returns Promise resolving to the ZIP blob
   */
  async generate(): Promise<Blob> {
    return await this.zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Balanced compression (1=fast, 9=best)
      },
    });
  }

  /**
   * Get the number of files in the ZIP.
   */
  getFileCount(): number {
    let count = 0;
    this.zip.forEach(() => {
      count++;
    });
    return count;
  }
}
