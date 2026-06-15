import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegistrationCode {
  codeId: string;
  code: string;
  email?: string | null;
  userRole: string;
  expiresOn: string;
  isUsed: boolean;
  usedOn?: string | null;
  createdOn: string;
  isExpired: boolean;
}

export interface CreateCodeRequest {
  email?: string;
  expiryDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class InviteCodesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${window.__env.NG_APP_API_URL}/organization`;

  getCodes(orgId: string): Observable<RegistrationCode[]> {
    return this.http.get<RegistrationCode[]>(`${this.baseUrl}/${orgId}/registration-codes`);
  }

  createCode(orgId: string, request: CreateCodeRequest): Observable<RegistrationCode> {
    return this.http.post<RegistrationCode>(`${this.baseUrl}/${orgId}/registration-codes`, request);
  }

  deleteCode(orgId: string, codeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orgId}/registration-codes/${codeId}`);
  }
}
