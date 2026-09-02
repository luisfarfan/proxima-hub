import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { App } from './app';

/**
 * El shell del hub: un `p-toast` y el `router-outlet`, nada más.
 *
 * Antes esto era el test de scaffold de Angular sin tocar: pedía un `h1` con
 * "Hello, proxima-hub" —texto que esta app nunca tuvo— y no proveía
 * `MessageService`, que `p-toast` inyecta. Fallaba desde siempre por dos
 * motivos que no dicen nada del hub. Ahora afirma lo que el shell realmente
 * monta, así que si alguien saca el outlet o el toast, esto se entera.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([]), MessageService],
    }).compileComponents();
  });

  it('monta el shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza el outlet de rutas y el toast', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const dom = fixture.nativeElement as HTMLElement;
    expect(dom.querySelector('router-outlet')).toBeTruthy();
    expect(dom.querySelector('p-toast')).toBeTruthy();
  });
});
