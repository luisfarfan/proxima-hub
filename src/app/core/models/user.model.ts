export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface HubUser {
  id: number;
  email: string;
  is_active: boolean;
  kind: string;
  is_super_admin: boolean;
  full_name: string | null;
  email_verified_at: string | null;
  business_ids: string[];
  roles: Role[];
  active_business?: BusinessMembership | null;
}

export type Entitlements = Record<string, boolean>;

export interface BusinessMembership {
  id: string;
  name: string;
  slug: string;
  currency_code?: string;
  entitlements?: Entitlements | null;
  is_platform_owner?: boolean;
}
