import { Injectable, computed, signal } from '@angular/core';
import type { RuntimeConfig, RuntimeConfigJson } from './runtime-config.types';

function normalizeConfig(raw: RuntimeConfigJson): RuntimeConfig {
  const base = raw.apiBaseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return {
    apiBaseUrl: base,
    apiV1BaseUrl: `${base}/api/v1`,
    appVersion: raw.appVersion?.trim() || undefined,
    turnstileSiteKey: raw.turnstileSiteKey?.trim() || undefined,
    googleClientId: raw.googleClientId?.trim() || undefined,
    adminUrl: raw.adminUrl?.replace(/\/+$/, '') ?? undefined,
    builderUrl: raw.builderUrl?.replace(/\/+$/, '') ?? undefined,
    posUrl: raw.posUrl?.replace(/\/+$/, '') ?? undefined,
    intelligenceUrl: raw.intelligenceUrl?.replace(/\/+$/, '') ?? undefined,
    mobileUrl: raw.mobileUrl?.replace(/\/+$/, '') ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly _config = signal<RuntimeConfig | null>(null);

  readonly config = this._config.asReadonly();

  readonly appVersion = computed(() => this._config()?.appVersion ?? null);
  readonly turnstileSiteKey = computed(() => this._config()?.turnstileSiteKey ?? null);
  readonly googleClientId = computed(() => this._config()?.googleClientId ?? null);
  readonly adminUrl = computed(() => this._config()?.adminUrl ?? null);
  readonly builderUrl = computed(() => this._config()?.builderUrl ?? null);
  readonly posUrl = computed(() => this._config()?.posUrl ?? null);
  readonly intelligenceUrl = computed(() => this._config()?.intelligenceUrl ?? null);
  readonly mobileUrl = computed(() => this._config()?.mobileUrl ?? null);

  initFromJson(raw: RuntimeConfigJson): void {
    this._config.set(normalizeConfig(raw));
  }

  requireConfig(): RuntimeConfig {
    const c = this._config();
    if (!c) throw new Error('Runtime config is not loaded yet.');
    return c;
  }
}
