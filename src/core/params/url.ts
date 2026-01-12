/**
 * URL encoding/decoding utilities for sharing simulation configurations.
 * Encodes full params (not minimal) for stability across version changes.
 * Uses pako/deflate compression to keep URLs manageable.
 */
import pako from 'pako';
import { toToml, parseTomlWithDefaults } from './toml';

type SimulationParams = any;

/**
 * Encode params to a shareable URL.
 * Uses full params for stability - links remain valid even if defaults change.
 *
 * @param modelName - Name of the model
 * @param params - Full simulation parameters
 * @returns Complete URL string with encoded params
 */
export function encodeParamsToUrl(
  modelName: string,
  params: SimulationParams
): string {
  const tomlString = toToml(params);
  const compressed = pako.deflate(tomlString);
  const base64 = btoa(String.fromCharCode(...compressed));
  // Make URL-safe: replace + with -, / with _, remove padding =
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('model', modelName);
  url.searchParams.set('config', urlSafe);
  return url.toString();
}

/**
 * Decode params from URL query parameters.
 *
 * @returns Object with modelName and params, or null if no valid config in URL
 */
export function decodeParamsFromUrl(): {
  modelName: string;
  params: SimulationParams;
} | null {
  const url = new URL(window.location.href);
  const modelName = url.searchParams.get('model');
  const config = url.searchParams.get('config');

  if (!modelName || !config) return null;

  try {
    // Restore base64 from URL-safe format
    let base64 = config.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) base64 += '=';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const tomlString = pako.inflate(bytes, { to: 'string' });
    const params = parseTomlWithDefaults(tomlString);
    return { modelName, params };
  } catch (e) {
    console.error('Failed to decode URL params:', e);
    return null;
  }
}

/**
 * Clear config params from URL without page reload.
 * Uses history.replaceState to avoid adding to browser history.
 */
export function clearUrlParams(): void {
  const url = new URL(window.location.origin + window.location.pathname);
  window.history.replaceState({}, '', url.toString());
}
