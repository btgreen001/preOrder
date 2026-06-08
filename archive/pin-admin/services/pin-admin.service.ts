import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PinUserDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  hasPinEnabled: boolean;
  isLocked: boolean;
  pinAttempts: number;
  pinSetOn?: Date;
}

export interface CreatePinUserRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface UpdatePinUserRequest {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
}

export interface AdminAuditLogDto {
  auditLogId: string;
  action: string;
  details: string;
  performedBy: string;
  loggedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PinAdminService {
  private readonly apiUrl = '/api/PinAdmin';

  constructor(private http: HttpClient) {}

  getUser(userId: string): Observable<PinUserDto> {
    return this.http.get<PinUserDto>(`${import.meta.env['NG_APP_API_URL']}/users/${userId}`);
  }

  getAllUsers(): Observable<PinUserDto[]> {
    return this.http.get<PinUserDto[]>(`${import.meta.env['NG_APP_API_URL']}/users`);
  }

  createUser(request: CreatePinUserRequest): Observable<PinUserDto> {
    return this.http.post<PinUserDto>(`${import.meta.env['NG_APP_API_URL']}/users`, request);
  }

  updateUser(userId: string, request: UpdatePinUserRequest): Observable<PinUserDto> {
    return this.http.put<PinUserDto>(`${import.meta.env['NG_APP_API_URL']}/users/${userId}`, request);
  }

  resetPin(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${import.meta.env['NG_APP_API_URL']}/users/${userId}/reset-pin`, {});
  }

  unlockUser(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${import.meta.env['NG_APP_API_URL']}/users/${userId}/unlock`, {});
  }

  getAuditLogs(startDate?: Date, endDate?: Date): Observable<AdminAuditLogDto[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<AdminAuditLogDto[]>(`${import.meta.env['NG_APP_API_URL']}/audit-logs`, { params });
  }
}
