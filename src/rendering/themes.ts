/**
 * Color themes and styling for the simulation renderer.
 */

export interface ColorTheme {
  background: number;
  cellSoft: (r: number, g: number, b: number, alpha: number) => number;
  cellHard: (r: number, g: number, b: number) => number;
  apicalPoint: number;
  basalPoint: number;
  apicalLink: number;
  basalLink: number;
  scaleBar: number;
  text: number;
}

/**
 * Convert RGB to hex color number.
 */
export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

/**
 * Convert RGB + alpha to hex (alpha is ignored for fill, used separately).
 */
export function rgbaToHex(r: number, g: number, b: number, _alpha: number): number {
  return rgbToHex(r, g, b);
}

/**
 * Default light theme.
 */
export const defaultTheme: ColorTheme = {
  background: 0xffffff,
  cellSoft: rgbaToHex,
  cellHard: rgbToHex,
  apicalPoint: 0x961414, // Dark red
  basalPoint: 0x000000,  // Black
  apicalLink: 0x640000,  // Dark red
  basalLink: 0x000000,   // Black
  scaleBar: 0x646464,    // Gray
  text: 0x5050a0,        // Blue-gray
};

/**
 * Dark theme for dark mode.
 */
export const darkTheme: ColorTheme = {
  background: 0x1a1a2e,
  cellSoft: rgbaToHex,
  cellHard: rgbToHex,
  apicalPoint: 0xff6b6b,
  basalPoint: 0xeeeeee,
  apicalLink: 0xff4444,
  basalLink: 0xcccccc,
  scaleBar: 0x888888,
  text: 0x8888cc,
};
