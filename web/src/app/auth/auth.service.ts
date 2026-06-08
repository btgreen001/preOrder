import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterUserRequest, AuthResponse } from '../core/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = import.meta.env['NG_APP_API_URL'] + '/auth';

  registerUser(data: RegisterUserRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${import.meta.env['NG_APP_API_URL']}/register-user`, data);
  }
}
