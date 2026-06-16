export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  is_super_admin?: boolean;
}
