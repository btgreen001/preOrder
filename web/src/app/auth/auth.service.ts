import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterUserRequest, AuthResponse } from '../core/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiBaseUrl = window.__env.NG_APP_BASE_URL;
  private apiUrl!: string;

  constructor() {
    this.apiUrl = this.apiBaseUrl + '/api/auth';
  }

  registerUser(data: RegisterUserRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-user`, data);
  }
}
