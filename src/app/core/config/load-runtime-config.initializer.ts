import { RuntimeConfigService } from './runtime-config.service';
import type { RuntimeConfigJson } from './runtime-config.types';

export function loadRuntimeConfigInitializer(runtime: RuntimeConfigService): () => Promise<void> {
  return () => {
    const url = new URL('config.json', document.baseURI).href;
    return fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load runtime config (${res.status}) from ${url}`);
      }
      const json = (await res.json()) as RuntimeConfigJson;
      if (!json.apiBaseUrl || typeof json.apiBaseUrl !== 'string') {
        throw new Error('Runtime config: apiBaseUrl is required');
      }
      runtime.initFromJson(json);
    });
  };
}
