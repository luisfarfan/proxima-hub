import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { ProximaPasswordInputComponent } from './proxima-password-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ProximaPasswordInputComponent],
  template: `
    <proxima-password-input inputId="pw" [required]="true" [control]="control" />
  `,
})
class HostComponent {
  readonly control = new FormControl('', { nonNullable: true });
}

function render() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.nativeElement as HTMLElement,
    input: () => fixture.nativeElement.querySelector('input') as HTMLInputElement,
    toggle: () => fixture.nativeElement.querySelector('button') as HTMLButtonElement,
  };
}

describe('ProximaPasswordInputComponent', () => {
  it('el ojito es un botón de verdad: enfocable, con nombre y sin enviar el formulario', () => {
    const { toggle } = render();

    expect(toggle()).not.toBeNull();
    expect(toggle().type).toBe('button');
    expect(toggle().tabIndex).toBe(0);
    expect(toggle().getAttribute('aria-label')).toBe('Mostrar la contraseña');
  });

  it('activarlo revela la contraseña y el nombre pasa a decir lo contrario', () => {
    const { fixture, input, toggle } = render();
    expect(input().getAttribute('type')).toBe('password');

    toggle().click();
    fixture.detectChanges();

    expect(input().getAttribute('type')).toBe('text');
    expect(toggle().getAttribute('aria-label')).toBe('Ocultar la contraseña');
  });

  it('el icono no le habla al lector de pantalla; el nombre lo pone el botón', () => {
    const { toggle } = render();

    expect(toggle().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('un campo obligatorio se anuncia como tal', () => {
    const { input } = render();

    expect(input().required).toBe(true);
  });
});
