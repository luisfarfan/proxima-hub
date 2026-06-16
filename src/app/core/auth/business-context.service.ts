import { Injectable, signal } from '@angular/core';
import type { HubUser, BusinessMembership, Entitlements } from '../models/user.model';

/** Active tenant context for the X-Business-ID HTTP header (see business-header.interceptor). */
@Injectable({ providedIn: 'root' })
export class BusinessContextService {
  private readonly _businessId = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('selected_business_id') : null,
  );
  private readonly _entitlements = signal<Entitlements | null>(null);
  private readonly _isPlatformOwner = signal(false);

  readonly businessId = this._businessId.asReadonly();
  readonly entitlements = this._entitlements.asReadonly();
  readonly isPlatformOwner = this._isPlatformOwner.asReadonly();

  setBusinessId(id: string | null): void {
    if (id) {
      localStorage.setItem('selected_business_id', id);
    } else {
      localStorage.removeItem('selected_business_id');
    }
    this._businessId.set(id);
  }

  applyMembership(biz: BusinessMembership): void {
    this.setBusinessId(biz.id);
    this._entitlements.set((biz.entitlements as Entitlements) ?? null);
    this._isPlatformOwner.set(!!biz.is_platform_owner);
  }

  syncFromUser(user: HubUser | null): void {
    if (!user) {
      this.setBusinessId(null);
      this._entitlements.set(null);
      this._isPlatformOwner.set(false);
      return;
    }

    this._entitlements.set((user.active_business?.entitlements as Entitlements) ?? null);
    this._isPlatformOwner.set(!!user.active_business?.is_platform_owner);

    const saved = localStorage.getItem('selected_business_id');

    if (user.is_super_admin) {
      if (saved) {
        this._businessId.set(saved);
      } else if (user.business_ids?.length === 1) {
        this.setBusinessId(user.business_ids[0]);
      }
      return;
    }

    if (user.active_business) {
      this.setBusinessId(user.active_business.id);
      return;
    }

    if (saved && user.business_ids?.includes(saved)) {
      this._businessId.set(saved);
      return;
    }

    if (user.business_ids?.length === 1) {
      this.setBusinessId(user.business_ids[0]);
    } else {
      this._businessId.set(null);
    }
  }
}
