import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Terminal {
  terminalUid: string;     // UUID
  terminalCode: string;
  location: string;
  isActive: boolean;
  createdOn?: string;
  updatedOn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerminalRequest {
  terminalCode: string;
  location: string;
}

export interface UpdateTerminalRequest {
  terminalCode: string;
  location: string;
  isActive: boolean;
}

export interface BindDeviceRequest {
  terminalUid: string;  // UUID
  deviceToken?: string;
}

export interface BindDeviceResponse {
  deviceToken: string;
  terminalId: number;
  terminalCode: string;
  isNewBinding: boolean;
  takeoverOccurred: boolean;
  previousDeviceToken?: string;
}

export interface UnbindDeviceRequest {
  terminalUid: string;  // UUID
}

export interface CheckBindingRequest {
  terminalUid: string;  // UUID
  deviceToken?: string;
}

export interface CheckBindingResponse {
  isBound: boolean;
  deviceToken?: string;
  terminalId?: number;
  terminalCode?: string;
  boundAt?: string;
  lastSeenAt?: string;
}

export interface DeviceContext {
  terminalUid: string;
  terminalCode: string;
  location: string;
  organizationId: string;
}

export interface TerminalDeviceBinding {
  terminalDeviceBindingId: number;
  organizationId: string;
  terminalId: number;
  terminalCode: string;
  deviceToken: string;
  boundByUserId?: string;
  boundAt: string;
  lastSeenAt: string;
  unboundAt?: string;
  unboundByUserId?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TerminalService {
  private readonly apiUrl = `${environment.apiUrl}/terminal`;
  private http = inject(HttpClient);

  /**
   * Get all terminals for the organization
   */
  getAllTerminals(): Observable<Terminal[]> {
    return this.http.get<Terminal[]>(this.apiUrl);
  }

  /**
   * Get all active terminals for the organization
   */
  getAvailableTerminals(): Observable<Terminal[]> {
    return this.http.get<Terminal[]>(`${this.apiUrl}/available`);
  }

  /**
   * Get terminal currently bound to this device token (if any)
   */
  getCurrentBinding(): Observable<Terminal | null> {
    return this.http.get<Terminal | null>(`${this.apiUrl}/current-binding`);
  }

  /**
   * Get terminal + org context from device_token cookie alone (no auth required).
   * Used to rehydrate TerminalContextService after a hard page reload.
   */
  getDeviceContext(): Observable<DeviceContext | null> {
    return this.http.get<DeviceContext | null>(`${this.apiUrl}/device-context`, { withCredentials: true });
  }

  /**
   * Releases the active device binding server-side using the device_token cookie.
   * Call on explicit logout so device-context returns null on next reload.
   */
  releaseDeviceContext(): Observable<{ released: boolean }> {
    return this.http.delete<{ released: boolean }>(`${this.apiUrl}/device-context`, { withCredentials: true });
  }

  /**
   * Get a specific terminal by UUID
   */
  getTerminal(terminalId: string): Observable<Terminal> {
    return this.http.get<Terminal>(`${this.apiUrl}/${terminalId}`);
  }

  /**
   * Create a new terminal
   */
  createTerminal(request: CreateTerminalRequest): Observable<Terminal> {
    return this.http.post<Terminal>(this.apiUrl, request);
  }

  /**
   * Update an existing terminal
   */
  updateTerminal(terminalId: string, request: UpdateTerminalRequest): Observable<Terminal> {
    return this.http.put<Terminal>(`${this.apiUrl}/${terminalId}`, request);
  }

  /**
   * Deactivate a terminal
   */
  deactivateTerminal(terminalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${terminalId}`);
  }

  /**
   * Reactivate a terminal
   */
  reactivateTerminal(terminalId: string): Observable<Terminal> {
    return this.http.post<Terminal>(`${this.apiUrl}/${terminalId}/reactivate`, {});
  }

  // ===== DEVICE BINDING METHODS =====

  /**
   * Bind current device to a terminal
   * Server sets HttpOnly cookie with device token
   */
  bindDevice(request: BindDeviceRequest): Observable<BindDeviceResponse> {
    return this.http.post<BindDeviceResponse>(`${this.apiUrl}/bind-device`, request);
  }

  /**
   * Unbind current device from terminal
   * Server clears HttpOnly cookie
   */
  unbindDevice(request: UnbindDeviceRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/unbind-device`, request);
  }

  /**
   * Check if current device is bound to terminal
   * Uses HttpOnly cookie from server
   */
  checkBinding(request: CheckBindingRequest): Observable<CheckBindingResponse> {
    return this.http.post<CheckBindingResponse>(`${this.apiUrl}/check-binding`, request);
  }

  /**
   * Admin: Get all active bindings for a terminal
   */
  getActiveBindings(terminalCode: string): Observable<TerminalDeviceBinding[]> {
    return this.http.get<TerminalDeviceBinding[]>(`${this.apiUrl}/bindings/${terminalCode}`);
  }

  /**
   * Admin: Force release a device binding
   */
  adminReleaseBinding(bindingId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/bindings/${bindingId}`);
  }
}
