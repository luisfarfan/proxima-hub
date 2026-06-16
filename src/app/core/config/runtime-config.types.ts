export interface RuntimeConfigJson {
  apiBaseUrl: string;
  turnstileSiteKey?: string;
  googleClientId?: string;
  adminUrl?: string;
  builderUrl?: string;
  posUrl?: string;
  intelligenceUrl?: string;
  mobileUrl?: string;
}

export interface RuntimeConfig {
  readonly apiBaseUrl: string;
  readonly apiV1BaseUrl: string;
  readonly turnstileSiteKey?: string;
  readonly googleClientId?: string;
  readonly adminUrl?: string;
  readonly builderUrl?: string;
  readonly posUrl?: string;
  readonly intelligenceUrl?: string;
  readonly mobileUrl?: string;
}
