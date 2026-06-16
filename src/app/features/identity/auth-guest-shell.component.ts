import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-auth-guest-shell',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './auth-guest-shell.component.html',
  styleUrl: './auth-guest-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthGuestShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly testId = input<string | null>(null);
  readonly split = input(false);

  readonly features = [
    'Enriquecimiento de catálogo con IA',
    'Pedidos y ventas en tiempo real',
    'Facturación electrónica SUNAT',
  ];
}
