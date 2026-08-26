import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProximaLogoComponent } from '../../shared/ui/proxima-logo.component';

@Component({
  selector: 'app-auth-guest-shell',
  standalone: true,
  imports: [ProximaLogoComponent],
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
    'Facturación electrónica SUNAT',
    'Ventas y stock al día',
    'Tu catálogo, listo con IA',
  ];

  /** El pie decía «2025» con el año ya cambiado; que lo diga el reloj. */
  readonly year = new Date().getFullYear();
}
