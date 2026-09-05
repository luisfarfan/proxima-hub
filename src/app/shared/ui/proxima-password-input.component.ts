import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';

/**
 * `p-password` con el ojito operable por teclado.
 *
 * PrimeNG v21 pinta el toggle como `<svg (click)="onMaskToggle()" />`: sin
 * `tabindex`, sin `role` y sin nombre accesible. Con teclado no hay forma de
 * revelar la contraseña y un lector de pantalla ni siquiera anuncia que el
 * control existe — WCAG 2.1.1 y 4.1.2.
 *
 * Los templates `#showicon`/`#hideicon` se renderizan dentro de un
 * `<span (click)="onMaskToggle()">`, así que un `<button>` adentro recibe el
 * click por burbujeo y aporta lo único que faltaba: foco, teclado y nombre. El
 * estado lo dice el propio nombre, que cambia con cada pulsación.
 */
@Component({
  selector: 'proxima-password-input',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordModule],
  template: `
    <p-password
      [formControl]="control()"
      [inputId]="inputId()"
      [feedback]="feedback()"
      [required]="required()"
      [toggleMask]="true"
      [autocomplete]="autocomplete()"
      [placeholder]="placeholder()"
      [styleClass]="styleClass()"
      [inputStyleClass]="inputStyleClass()"
      [promptLabel]="promptLabel()"
      [weakLabel]="weakLabel()"
      [mediumLabel]="mediumLabel()"
      [strongLabel]="strongLabel()"
    >
      <ng-template #showicon let-iconClass="class">
        <button type="button" [class]="iconClass + ' ' + toggleClass" aria-label="Mostrar la contraseña">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </ng-template>

      <ng-template #hideicon let-iconClass="class">
        <button type="button" [class]="iconClass + ' ' + toggleClass" aria-label="Ocultar la contraseña">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243" />
          </svg>
        </button>
      </ng-template>
    </p-password>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProximaPasswordInputComponent {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly autocomplete = input<string>('current-password');
  readonly placeholder = input<string | undefined>(undefined);
  readonly feedback = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly styleClass = input('w-full [&_.p-inputtext]:w-full');
  readonly inputStyleClass = input('');
  readonly promptLabel = input<string | undefined>(undefined);
  readonly weakLabel = input<string | undefined>(undefined);
  readonly mediumLabel = input<string | undefined>(undefined);
  readonly strongLabel = input<string | undefined>(undefined);

  /** El botón hereda la posición del icono; sólo agrega área de click y foco. */
  readonly toggleClass =
    'inline-flex items-center justify-center rounded-md bg-transparent p-0 text-muted-color hover:text-color focus-linear';
}
