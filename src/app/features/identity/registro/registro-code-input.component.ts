import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Las seis casillas del código de verificación.
 *
 * Antes era un solo `input` con `letter-spacing`: se veía como seis casillas
 * pero se comportaba como un campo de texto — no se sabía cuántos dígitos
 * faltaban y pegar el código del correo dejaba el cursor en cualquier parte.
 * Acá el foco avanza solo, Backspace retrocede, y pegar los seis dígitos
 * llena todo de una.
 */
@Component({
  selector: 'app-registro-code-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './registro-code-input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RegistroCodeInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="boxes" role="group" [attr.aria-label]="ariaLabel()" [attr.aria-describedby]="describedBy() || null">
      @for (slot of slots; track slot) {
        <input
          #box
          class="box"
          [class.is-invalid]="invalid()"
          type="text"
          inputmode="numeric"
          maxlength="1"
          [attr.autocomplete]="slot === 0 ? 'one-time-code' : 'off'"
          [attr.aria-label]="'Dígito ' + (slot + 1) + ' de 6'"
          [value]="digitAt(slot)"
          [disabled]="disabled()"
          (input)="onInput(slot, $event)"
          (keydown)="onKeydown(slot, $event)"
          (paste)="onPaste($event)"
          (focus)="onFocus($event)"
        />
      }
    </div>
  `,
})
export class RegistroCodeInputComponent implements ControlValueAccessor {
  readonly ariaLabel = input<string>('Código de verificación de 6 dígitos');
  readonly describedBy = input<string>('');
  readonly invalid = input<boolean>(false);

  protected readonly slots = [0, 1, 2, 3, 4, 5];
  protected readonly disabled = signal(false);

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');
  private readonly value = signal('');

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set((value ?? '').replace(/\D/g, '').slice(0, 6));
    this.paint();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected digitAt(index: number): string {
    return this.value().charAt(index) ?? '';
  }

  protected onInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const digit = el.value.replace(/\D/g, '').slice(-1);
    this.setDigit(index, digit);
    el.value = digit;
    if (digit) this.focusBox(index + 1);
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (this.digitAt(index)) {
        this.setDigit(index, '');
        return;
      }
      event.preventDefault();
      this.setDigit(index - 1, '');
      this.focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusBox(index + 1);
    }
  }

  /** El código llega del correo de una sola pieza: se acepta entero. */
  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    this.commit(digits);
    this.focusBox(Math.min(digits.length, 5));
  }

  protected onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
    this.onTouched();
  }

  private setDigit(index: number, digit: string): void {
    if (index < 0 || index > 5) return;
    const chars = this.value().padEnd(6, ' ').split('');
    chars[index] = digit || ' ';
    this.commit(chars.join('').replace(/ /g, ''));
  }

  private commit(next: string): void {
    this.value.set(next);
    this.paint();
    this.onChange(next);
  }

  private paint(): void {
    this.boxes().forEach((ref, i) => {
      ref.nativeElement.value = this.digitAt(i);
    });
  }

  private focusBox(index: number): void {
    const target = this.boxes()[Math.max(0, Math.min(index, 5))];
    target?.nativeElement.focus();
  }
}
