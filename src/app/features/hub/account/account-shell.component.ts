import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountShellComponent {}
