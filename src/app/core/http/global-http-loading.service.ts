import { Injectable, signal } from '@angular/core';

const SHOW_DELAY_MS = 200;
const MIN_VISIBLE_MS = 300;

@Injectable({ providedIn: 'root' })
export class GlobalHttpLoadingService {
  private readonly pendingCount = signal(0);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleSince = 0;

  readonly active = signal(false);

  begin(): void {
    this.pendingCount.update((n) => n + 1);
    if (this.pendingCount() === 1) this.scheduleShow();
  }

  end(): void {
    this.pendingCount.update((n) => Math.max(0, n - 1));
    if (this.pendingCount() === 0) this.scheduleHide();
  }

  private scheduleShow(): void {
    if (this.showTimer != null) return;
    this.clearHideTimer();
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.pendingCount() > 0) {
        this.visibleSince = Date.now();
        this.active.set(true);
      }
    }, SHOW_DELAY_MS);
  }

  private scheduleHide(): void {
    if (this.showTimer != null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (!this.active()) return;
    const elapsed = Date.now() - this.visibleSince;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (this.pendingCount() === 0) {
        this.active.set(false);
        this.visibleSince = 0;
      }
    }, delay);
  }

  private clearHideTimer(): void {
    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
