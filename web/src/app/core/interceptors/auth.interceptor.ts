import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { LoadingService } from '../services/loading.service';
import { TerminalContextService } from '../services/terminal-context.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private authService = inject(AuthService);
  private errorHandler = inject(ErrorHandlerService);
  private loadingService = inject(LoadingService);
  private terminalContextService = inject(TerminalContextService);
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private readonly logger = console; // For detailed debugging

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get the JWT access token from in-memory storage
    const accessToken = this.authService.getAccessToken();
    
    // Show loading indicator for non-GET requests
    const showLoading = request.method !== 'GET';
    if (showLoading) {
      this.loadingService.show();
    }
    
    const isPublicPreorderRequest = request.url.includes('/api/public/preorders');
    const isPublicOrderSelfServiceRequest = /\/api\/orders\/[^/]+\/(pickup-slot|cancel)(\?|$)/.test(request.url);
    const isAnonymousRequest = isPublicPreorderRequest || isPublicOrderSelfServiceRequest;

    // Clone the request and add the Bearer token + credentials for cookies
    const modifiedRequest = accessToken 
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          },
          withCredentials: !isAnonymousRequest // Avoid auth cookie flow on anonymous endpoints
        })
      : request.clone({
          withCredentials: !isAnonymousRequest // Anonymous endpoints should not trigger auth refresh behavior
        });
    
    return next.handle(modifiedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors
        if (error.status === 401) {
          this.logger.log('[AuthInterceptor] 401 Error on:', request.url);
          this.logger.log('[AuthInterceptor] Error response:', error.error);
          
          // Check if this is an idle timeout error FIRST
          // Middleware returns idle_timeout reason on any endpoint when session is idle
          const isIdleTimeout = error?.error?.reason === 'idle_timeout';
          this.logger.log('[AuthInterceptor] isIdleTimeout:', isIdleTimeout);
          
          if (isIdleTimeout) {
            this.logger.log('[AuthInterceptor] Detected IDLE TIMEOUT - navigating to PIN signin');
            this.authService.clearLocalState();
            this.router.navigate(['/pin-signin'], { queryParams: { idleTimeout: 'true' } });
            return throwError(() => new Error('Session expired due to inactivity'));
          }
          
          if (request.url.includes('/api/public/preorders') || isPublicOrderSelfServiceRequest) {
            return throwError(() => error);
          }

          // Not an idle timeout, attempt normal token refresh
          this.logger.log('[AuthInterceptor] Not idle timeout - attempting normal token refresh');
          return this.handle401Error(request, next);
        }
        
        // Handle other errors with user-friendly messages
        this.errorHandler.showError(error);
        this.errorHandler.logError(error, `HTTP ${request.method} ${request.url}`);
        
        return throwError(() => error);
      }),
      finalize(() => {
        if (showLoading) {
          this.loadingService.hide();
        }
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip refresh attempts for auth endpoints to avoid infinite loops.
    // DO NOT navigate here — callers like initializeAuth() and handle401Error's own catchError
    // already handle navigation. Navigating here races with APP_INITIALIZER.
    if (request.url.includes('/api/auth/login') || 
        request.url.includes('/api/auth/register') ||
        request.url.includes('/api/auth/refresh-token') ||
        request.url.includes('/api/auth/pin-login')) {
      return throwError(() => new Error('Authentication failed'));
    }

    // Anonymous endpoints: 401 means endpoint or middleware rejected the request.
    // Don't navigate or retry — let the caller's catchError handle it.
    if (request.url.includes('/api/terminal/device-context') ||
        request.url.includes('/api/public/preorders') ||
        /\/api\/orders\/[^/]+\/(pickup-slot|cancel)(\?|$)/.test(request.url)) {
      return throwError(() => new Error('Anonymous endpoint unavailable'));
    }

    // Logout endpoints: 401 means the token was already gone — just clear and navigate, no retry
    if (request.url.includes('/api/auth/logout')) {
      this.authService.clearLocalState();
      const logoutRedirect = request.headers.get('X-Logout-Redirect');
      if (logoutRedirect === 'pin-signin') {
        this.router.navigate(['/pin-signin']);
      } else {
        this.router.navigate(['/login']);
      }
      return throwError(() => new Error('Logged out'));
    }

    // For pin-users endpoint: 401 means org context missing or invalid — just throw,
    // let the pin-signin component handle the error display. Don't clear state or navigate.
    if (request.url.includes('/api/auth/pin-users')) {
      return throwError(() => new Error('Authentication failed'));
    }

    // Attempt token refresh using HttpOnly cookie
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      
      // Show loading indicator for token refresh
      this.loadingService.showTokenRefresh();

      return this.authService.refreshAccessToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response);
          this.loadingService.hide();
          
          // Retry the original request with new Bearer token
          const newAccessToken = this.authService.getAccessToken();
          if (newAccessToken) {
            const retryRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              },
              withCredentials: true
            });
            return next.handle(retryRequest);
          }
          
          return throwError(() => new Error('Token refresh succeeded but no access token available'));
        }),
        catchError((refreshError: any) => {
          this.isRefreshing = false;
          this.loadingService.hide();
          
          this.logger.log('[AuthInterceptor] Token refresh failed:', refreshError);
          
          // Check if this is an idle timeout
          const isIdleTimeout = refreshError?.error?.reason === 'idle_timeout';
          const hasTerminalContext = this.terminalContextService.hasTerminalContext();
          
          this.logger.log('[AuthInterceptor] Refresh error - isIdleTimeout:', isIdleTimeout);
          this.logger.log('[AuthInterceptor] Refresh error - hasTerminalContext:', hasTerminalContext);
          
          // If idle timeout OR refresh failed and we have terminal context, go to PIN signin
          if (isIdleTimeout || hasTerminalContext) {
            this.logger.log('[AuthInterceptor] Routing to PIN signin (idleTimeout=' + isIdleTimeout + ', terminal=' + hasTerminalContext + ')');
            this.authService.clearLocalState();
            this.router.navigate(['/pin-signin'], { queryParams: { idleTimeout: 'true' } });
          } else {
            // No terminal context and not idle timeout - go to standard login
            this.logger.log('[AuthInterceptor] Routing to standard login (no terminal, not idle)');
            this.errorHandler.showError(refreshError);
            this.authService.clearLocalState();
            this.router.navigate(['/login']);
          }
          
          return throwError(() => refreshError);
        })
      );
    } else {
      // If refresh is in progress, wait for it to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(() => {
          // Retry the original request with new Bearer token
          const newAccessToken = this.authService.getAccessToken();
          if (newAccessToken) {
            const retryRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              },
              withCredentials: true
            });
            return next.handle(retryRequest);
          }
          
          return throwError(() => new Error('No access token available after refresh'));
        })
      );
    }
  }
}
