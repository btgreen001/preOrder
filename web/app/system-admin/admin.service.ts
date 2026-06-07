import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from '../core/models/auth.model';

export interface Organization {
  organizationId: string;
  organizationName: string;
  primaryEmail: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  registrationToken: string;
  isEnabled: boolean;
  createdOn: string;
  modifiedOn: string;
  licenseTier?: string;
}

export interface SystemUser {
  userId: string;
  emailAddress: string;
  userName: string;
  firstName: string;
  lastName: string;
  userRole: string;
  isEnabled: boolean;
  organizationId: string;
  createdOn: string;
  lastLoginOn?: string;
}

export interface UpdateUserRequest {
  userRole?: string;
  isEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl + '/organization';

  getAllOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.apiUrl}`);
  }

  getAllUsers(): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(`${this.apiUrl}/users`);
  }

  updateOrganizationLicense(organizationId: string, newTier: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${organizationId}/license`, newTier, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  updateUser(userId: string, data: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/users/${userId}`, data);
  }

  emulateUser(userId: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/emulate/${userId}`, {});
  }
}
