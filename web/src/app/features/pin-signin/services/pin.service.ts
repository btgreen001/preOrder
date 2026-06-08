import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { TerminalContextService } from '../../../core/services/terminal-context.service';
import { AuthResponse } from '../../../core/models/auth.model';

export interface PinUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  hasPinEnabled: boolean;
}

export interface PinAuthResponse {
  accessToken: string;
  userId: string;
  organizationId: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
  licenseTier: string;
  registrationToken: string;
}

export interface PinManagement {
  userId: string;
  hasPin: boolean;
  pinCreatedDate?: Date;
  pinLastUsedDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PinService {
  private readonly apiUrl = `${import.meta.env.NG_APP_API_URL}/auth`;
  private authService = inject(AuthService);
  private terminalContext = inject(TerminalContextService);
  private http = inject(HttpClient);

  /**
   * Get list of users with PIN-enabled accounts for this device/organization
   * SECURITY: Organization ID comes ONLY from user's JWT token (authService)
   * Terminal context is optional device binding - it does NOT affect org selection
   */
  getAvailableUsers(): Observable<PinUser[]> {
    // Prefer org ID from authenticated JWT; fall back to terminal context (survives logout/reload)
    const organizationId = this.authService.getOrganizationId()
                        ?? this.terminalContext.getOrganizationId();
    
    // POST request to get PIN users - organization ONLY from auth service
    return this.http.post<PinUser[]>(`${import.meta.env.NG_APP_API_URL}/pin-users`, {
      organizationId: organizationId || null
    });
  }

  /**
   * Authenticate user with PIN
   * Requires a valid token from the currently logged-in user
   * Allows switching to another user (in same organization) with valid PIN
   */
  authenticateWithPin(userId: string, pin: string): Observable<PinAuthResponse> {
    return this.http.post<PinAuthResponse>(`${import.meta.env.NG_APP_API_URL}/pin-login`, {
      userId,
      pin
    }, {
      withCredentials: true // Include HttpOnly cookie for refresh token and current user's Bearer token via interceptor
    }).pipe(
      tap(response => {
        // Update AuthService with the new token and user info
        if (response && response.accessToken) {
          const authResponse = {
            userId: response.userId,
            username: response.userName,  // Backend returns userName, frontend expects username
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            role: response.role,
            organizationId: response.organizationId,
            organizationName: response.organizationName,
            licenseTier: response.licenseTier,
            registrationToken: response.registrationToken,
            accessToken: response.accessToken,
            refreshToken: undefined // Refresh token is in HttpOnly cookie
          } as AuthResponse;
          
          // Use public method to set auth state
          this.authService.setAuthState(authResponse);
        }
      })
    );
  }

  /**
   * Create or update PIN for a user (admin function)
   */
  setUserPin(userId: string, pin: string): Observable<void> {
    return this.http.post<void>(`${import.meta.env.NG_APP_API_URL}/pin/set`, {
      userId,
      pin
    });
  }

  /**
   * Remove PIN for a user (admin function)
   */
  removeUserPin(userId: string): Observable<void> {
    return this.http.delete<void>(`${import.meta.env.NG_APP_API_URL}/pin/${userId}`);
  }

  /**
   * Get PIN management status for a user
   */
  getPinStatus(userId: string): Observable<PinManagement> {
    return this.http.get<PinManagement>(`${import.meta.env.NG_APP_API_URL}/pin/status/${userId}`);
  }

  /**
   * Validate PIN format (client-side only)
   */
  validatePinFormat(pin: string): { valid: boolean; error?: string } {
    if (!pin || pin.length !== 4) {
      return { valid: false, error: 'PIN must be exactly 4 digits' };
    }

    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, error: 'PIN must contain only numbers' };
    }

    // Check for weak PINs
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPins.includes(pin)) {
      return { valid: false, error: 'PIN is too weak. Please choose a different PIN' };
    }

    return { valid: true };
  }
}
