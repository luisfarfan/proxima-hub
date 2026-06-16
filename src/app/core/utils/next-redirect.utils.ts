import type { RuntimeConfig } from '../config/runtime-config.types';

/**
 * Validates a `?next=` redirect URL against the Proxima allowlist.
 * Prod: only `*.proxima.pe` domains are allowed (anti open-redirect, ADR-013).
 * Dev: `localhost` and `*.localhost` subdomains are also allowed.
 *
 * Returns the validated URL (href) or null if invalid.
 */
export function validateNextUrl(next: string | null | undefined, config: RuntimeConfig): string | null {
  if (!next) return null;

  let parsed: URL;
  try {
    parsed = new URL(next);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const apiHostname = new URL(config.apiBaseUrl).hostname;
  const isDev = apiHostname === 'localhost' || apiHostname.endsWith('.localhost');
  const target = parsed.hostname;

  if (isDev) {
    if (target !== 'localhost' && !target.endsWith('.localhost')) return null;
  } else {
    if (!target.endsWith('.proxima.pe')) return null;
  }

  return parsed.href;
}
