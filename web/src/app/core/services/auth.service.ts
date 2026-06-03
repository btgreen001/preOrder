import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, EMPTY } from 'rxjs';
import { catchError, map, tap, switchMap, share } from 'rxjs/operators';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterUserRequest, 
  RegisterCompanyRequest, 
  CompanyRegistrationResponse,
  CompanyProfile,
  ForgotPasswordCodeRequest,
  ForgotUsernameRequest,
  MyProfileResponse,
  ResetPasswordWithCodeRequest,
  UpdateCompanyProfileRequest,
  UpdateMyProfileRequest
} from '../models/auth.model';
import { LicenseTier } from '../../../shared-data-services/license.service';
import { environment } from '../../../environments/environment';
import { TerminalContextService } from './terminal-context.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private terminalContext = inject(TerminalContextService);

  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<AuthResponse | null>;
  public currentUser: Observable<AuthResponse | null>;
  
  // In-memory token storage - no persistence
  private accessToken: string | null = null;
  private organizationId: string | null = null; // Preserve org ID even after session expires (for PIN users endpoint)
  // Refresh token is stored in HttpOnly cookie by backend - not accessible to JavaScript
  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshInProgress: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isRefreshing = false;

  private isGuid(value: string | null | undefined): value is string {
    return !!value
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  constructor() {
    // Initialize with null - no persistence across browser sessions
    this.currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Enforce HTTPS if required
    this.enforceHttps();
  }

  public get currentUserValue(): AuthResponse | null {
    return this.currentUserSubject.value;
  }

  getRefreshToken(): string | null {
    // Refresh token is stored in HttpOnly cookie by backend - not accessible to JavaScript
    return null;
  }

  getBasicAuthHeader(): string | null {
    return null;
  }


  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getOrganizationId(): string | null {
    return this.organizationId;
  }

  // JWT Bearer token login with HttpOnly cookie for refresh token
  login(credentials: LoginRequest): Observable<AuthResponse> {
    const requestedTerminalId = credentials.terminalId || this.terminalContext.getTerminalId();
    const terminalId = this.isGuid(requestedTerminalId) ? requestedTerminalId : undefined;

    // Add terminalId from context if available
    const loginRequest: LoginRequest = {
      ...credentials,
      terminalId
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest, {
      withCredentials: true // Enable cookies for refresh token
    }).pipe(
      tap((userProfile: AuthResponse) => {
        // Store only access token in memory
        this.accessToken = userProfile.accessToken || null;
        // Refresh token is in HttpOnly cookie - backend manages it
        this.currentUserSubject.next(userProfile);
        
        // Store organization ID for later use (needed for PIN users endpoint after session expires)
        this.organizationId = userProfile.organizationId || null;

        // Store terminal context if provided in response
        if (userProfile.terminalId && userProfile.organizationId) {
          this.terminalContext.setTerminalContext({
            terminalId: userProfile.terminalId,
            organizationId: userProfile.organizationId,
            terminalCode: userProfile.terminalCode || '',
            location: userProfile.location || ''
          });
        }
        
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        // Check for org mismatch error (403)
        if (error.status === 403) {
          console.error('[AuthService] Organization mismatch: Terminal bound to different organization');
        }
        return throwError(() => error);
      })
    );
  }

  registerUser(userData: RegisterUserRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register-user`, userData, {
      withCredentials: true // Enable cookies
    }).pipe(
        tap(response => {
          // Store only access token in memory
          this.accessToken = response.accessToken || null;
          // Refresh token is in HttpOnly cookie
          this.currentUserSubject.next(response);
          this.scheduleTokenRefresh();
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  registerCompany(companyData: RegisterCompanyRequest): Observable<CompanyRegistrationResponse> {
    return this.http.post<CompanyRegistrationResponse>(`${this.apiUrl}/register-company`, companyData, {
      withCredentials: true // Enable cookies
    }).pipe(
        tap(response => {
          // Merge registrationToken from top-level response into adminAuth
          const adminAuthWithToken = {
            ...response.adminAuth,
            registrationToken: response.registrationToken
          };
          // Store only access token in memory
          this.accessToken = adminAuthWithToken.accessToken || null;
          // Refresh token is in HttpOnly cookie
          this.currentUserSubject.next(adminAuthWithToken);
          this.scheduleTokenRefresh();
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getMyProfile(): Observable<MyProfileResponse> {
    return this.http.get<MyProfileResponse>(`${this.apiUrl}/me`);
  }

  updateMyProfile(request: UpdateMyProfileRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/me/profile`, request).pipe(
      tap(() => {
        const current = this.currentUserValue;
        if (!current) {
          return;
        }

        this.currentUserSubject.next({
          ...current,
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName
        });
      })
    );
  }

  getMyCompanyProfile(): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${environment.apiUrl}/organization/my-profile`);
  }

  updateMyCompanyProfile(request: UpdateCompanyProfileRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiUrl}/organization/my-profile`, request).pipe(
      tap(() => {
        const current = this.currentUserValue;
        if (!current) {
          return;
        }

        this.currentUserSubject.next({
          ...current,
          organizationName: request.organizationName
        });
      })
    );
  }

  markOnboardingComplete(): Observable<{ message: string; hasCompletedOnboarding: boolean }> {
    return this.http.post<{ message: string; hasCompletedOnboarding: boolean }>(`${this.apiUrl}/me/onboarding-complete`, {}).pipe(
      tap((response) => {
        const current = this.currentUserValue;
        if (!current) {
          return;
        }

        this.currentUserSubject.next({
          ...current,
          hasCompletedOnboarding: response.hasCompletedOnboarding
        });
      })
    );
  }

  requestPasswordResetCode(request: ForgotPasswordCodeRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password/code`, request);
  }

  requestUsernameReminder(request: ForgotUsernameRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-username`, request);
  }

  resetPasswordWithCode(request: ResetPasswordWithCodeRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password/reset`, request);
  }

  checkUsernameAvailability(username: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-username/${username}`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /** Clear only in-memory auth state — no backend call. Used by the interceptor to break retry loops. */
  clearLocalState(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    this.accessToken = null;
    this.isRefreshing = false;
    this.refreshInProgress.next(false);
    this.currentUserSubject.next(null);
    console.debug('[AuthService] clearLocalState: Layer 2 cleared, Layer 1 (terminal context) preserved');
  }


  logout(allSessions = false, redirectTo: 'login' | 'pin-signin' = 'login'): void {
    // Capture token BEFORE clearing state — the backend endpoint is [Authorize]
    // and needs a valid Bearer token to identify the session via jti claim.
    const tokenSnapshot = this.accessToken;
    // Clear local state immediately so the UI reacts right away
    this.clearLocalState();

    // Call backend to revoke the session and clear the HttpOnly cookie
    const endpoint = allSessions ? 'logout-all' : 'logout';
    const headers: Record<string, string> = {};
    if (tokenSnapshot) headers['Authorization'] = `Bearer ${tokenSnapshot}`;
    headers['X-Logout-Redirect'] = redirectTo;
    this.http.post(`${this.apiUrl}/${endpoint}`, {}, { withCredentials: true, headers }).subscribe({
      next: () => { /* Session revoked server-side */ },
      error: (err) => {
        console.debug('Logout backend call failed (already logged out?):', err.status);
      }
    });
  }

  // Public method to set auth state after PIN login or other auth methods
  setAuthState(authResponse: AuthResponse): void {
    this.accessToken = authResponse.accessToken || null;
    this.currentUserSubject.next(authResponse);
    this.scheduleTokenRefresh();
  }

  // Initialize auth state on app startup - checks if user has a valid session
  // This is called via APP_INITIALIZER to restore auth state after page refresh
  initializeAuth(): Observable<void> {
    // Try to refresh the token using the HttpOnly refresh token cookie
    // If a valid refresh token exists in the cookie, it will return a new access token
    // If no refresh token cookie exists, the backend will reject with "No refresh token provided"
    // which is expected for first-time users who haven't logged in yet
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, {}, {
      withCredentials: true // Send refresh token cookie (if it exists)
    }).pipe(
      tap((response: AuthResponse) => {
        // User has a valid session - restore auth state
        this.accessToken = response.accessToken || null;
        
        // Extract and preserve organization ID from token for use during idle timeout
        if (response.accessToken) {
          const tokenPayload = this.decodeToken(response.accessToken) as { org_id?: string } | null;
          this.organizationId = tokenPayload?.org_id || this.organizationId; // Keep previous org ID if new token doesn't have one
        }
        
        this.currentUserSubject.next(response);
        this.scheduleTokenRefresh();
        console.debug('Session restored from refresh token');
      }),
      catchError(() => {
        // No valid session or refresh failed - user needs to log in
        // This is normal for first-time visitors or expired sessions
        // 401 is expected when there's no refresh token cookie
        console.debug('No active session on app init - user must log in');
        this.currentUserSubject.next(null);
        this.accessToken = null;
        // Return empty observable to complete successfully without error
        // This prevents the 401 from propagating as an app initialization error
        return EMPTY;
      }),
      map(() => undefined) // Convert response to void
    );
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }

  hasRole(role: string): boolean {
    return this.currentUserValue?.role === role;
  }

  getLicenseTier(): LicenseTier {
    return this.currentUserValue?.licenseTier as LicenseTier || 'basic';
  }

  // Token refresh logic using HttpOnly cookie
  refreshAccessToken(): Observable<AuthResponse> {
    if (this.isRefreshing) {
      // If refresh is already in progress, wait for it to complete
      return this.refreshInProgress.pipe(
        switchMap((isRefreshing) => {
          if (!isRefreshing) {
            const currentUser = this.currentUserValue;
            return currentUser ? 
              new Observable<AuthResponse>(subscriber => {
                subscriber.next(currentUser);
                subscriber.complete();
              }) : 
              throwError(() => new Error('Refresh failed'));
          }
          return EMPTY;
        })
      );
    }

    this.isRefreshing = true;
    this.refreshInProgress.next(true);

    // Refresh token is sent automatically via HttpOnly cookie
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, {}, {
      withCredentials: true // Send refresh token cookie
    }).pipe(
      tap((response: AuthResponse) => {
        this.accessToken = response.accessToken || null;
        // New refresh token automatically updated via cookie
        this.currentUserSubject.next(response);
        this.scheduleTokenRefresh();
        this.isRefreshing = false;
        this.refreshInProgress.next(false);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.isRefreshing = false;
        this.refreshInProgress.next(false);
        this.logout(); // Force logout on refresh failure
        return throwError(() => error);
      }),
      share()
    );
  }

  // Schedule automatic token refresh before expiration
  private scheduleTokenRefresh(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }

    if (!this.accessToken) {
      return;
    }

    try {
      // Decode token to get expiration time (for JWT-like tokens)
      const tokenPayload = this.decodeToken(this.accessToken);
      if (tokenPayload && tokenPayload.exp) {
        const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;
        
        // Refresh token 2 minutes before expiration, but not less than 1 minute
        const refreshTime = Math.max(timeUntilExpiration - (2 * 60 * 1000), 60 * 1000);
        
        if (refreshTime > 0) {
          this.tokenExpirationTimer = setTimeout(() => {
            this.refreshAccessToken().subscribe({
              error: (error) => console.error('Auto-refresh failed:', error)
            });
          }, refreshTime);
        }
      }
    } catch (error) {
      console.warn('Could not decode token for auto-refresh:', error);
    }
  }

  // JWT token decoder (format: header.payload.signature)
  private decodeToken(token: string): { exp?: number } | null {
    try {
      // JWT has three parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid JWT format - expected 3 parts');
        return null;
      }
      
      // Decode the payload (second part)
      const payload = parts[1];
      // Replace URL-safe characters and pad if necessary
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (error) {
      console.warn('Token decode failed:', error);
      return null;
    }
  }

  // Handle token expiration errors
  handleTokenExpiration(): Observable<AuthResponse> {
    // Always attempt refresh - refresh token is in HttpOnly cookie
    return this.refreshAccessToken();
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    if (!this.accessToken) {
      return true;
    }

    try {
      const tokenPayload = this.decodeToken(this.accessToken);
      if (tokenPayload && tokenPayload.exp) {
        return Date.now() >= tokenPayload.exp * 1000;
      }
      // If we can't decode the token or it doesn't have exp, consider it expired
      return true;
    } catch (error) {
      console.warn('Could not check token expiration:', error);
      // If we can't decode the token, consider it expired for security
      return true;
    }
  }

  // Revoke refresh token using HttpOnly cookie
  revokeRefreshToken(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/revoke-token`, {}, {
      withCredentials: true // Send refresh token cookie
    }).pipe(
      tap(() => {
        this.logout();
      }),
      catchError(error => {
        console.error('Token revocation failed:', error);
        this.logout(); // Still logout even if revocation fails
        return throwError(() => error);
      })
    );
  }

  // HTTPS enforcement methods
  enforceHttps(): void {
    if (environment.enforceHttps && !this.isHttps()) {
      console.warn('Redirecting to HTTPS for security');
      window.location.href = window.location.href.replace('http://', 'https://');
    }
  }

  private isHttps(): boolean {
    return window.location.protocol === 'https:';
  }

  // Get the appropriate API URL based on environment and protocol
  getApiUrl(): string {
    if (environment.enforceHttps && environment.httpsApiUrl) {
      return environment.httpsApiUrl;
    }
    return environment.apiUrl;
  }
}
