import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AuthInlineAlertSeverity = 'success' | 'error' | 'info';

@Component({
  selector: 'app-auth-inline-alert',
  standalone: true,
  template: `
    <div
      role="alert"
      class="rounded-md px-3 py-2.5 text-[0.8125rem] leading-relaxed border border-hairline transition-colors duration-200"
      [class]="boxClass()"
    >
      {{ message() }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthInlineAlertComponent {
  readonly severity = input<AuthInlineAlertSeverity>('info');
  readonly message = input.required<string>();

  boxClass(): string {
    switch (this.severity()) {
      case 'success':
        return 'bg-green-500/[0.06] text-green-900 ring-green-500/20';
      case 'error':
        return 'bg-red-500/[0.04] text-red-800 ring-red-500/20';
      default:
        return 'bg-surface-100 text-muted-color ring-black/[0.06]';
    }
  }
}
