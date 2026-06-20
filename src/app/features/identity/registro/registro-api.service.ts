import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SUPPRESS_ERROR_TOAST, type RegisterPayload } from '@luisfarfan/auth';

const guestOptions = { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) };

export interface RubroOption {
  value: string;
  label: string;
}

export interface RegistrationStartResponse {
  registration_id: string;
  email: string;
  expires_in: number;
  dev_code?: string | null;
}

interface AcquisitionCategoryItem {
  id: string;
  label_es: string;
}

interface AcquisitionCategoriesResponse {
  items: AcquisitionCategoryItem[];
}

@Injectable({ providedIn: 'root' })
export class RegistroApiService {
  private readonly http = inject(HttpClient);

  listRubros(): Observable<RubroOption[]> {
    return this.http
      .get<AcquisitionCategoriesResponse>('acquisition/categories', guestOptions)
      .pipe(
        map((res) =>
          (res.items ?? []).map((it) => ({ value: it.id, label: it.label_es })),
        ),
      );
  }

  startRegistration(payload: RegisterPayload): Observable<RegistrationStartResponse> {
    return this.http.post<RegistrationStartResponse>('auth/register/start', payload, guestOptions);
  }

  resendCode(registrationId: string): Observable<RegistrationStartResponse> {
    return this.http.post<RegistrationStartResponse>(
      'auth/register/resend',
      { registration_id: registrationId },
      guestOptions,
    );
  }
}
