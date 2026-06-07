import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER, InjectionToken } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { EMPTY } from 'rxjs';
import { catchError, switchMap, tap, defaultIfEmpty } from 'rxjs/operators';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { TerminalService } from './features/terminals/services/terminal.service';
import { TerminalContextService } from './core/services/terminal-context.service';

export interface IdleConfig {
  timeoutMs: number;
  gracePeriodMs: number;
  checkIntervalMs: number;
}

export const IDLE_CONFIG = new InjectionToken<IdleConfig>('idle.config');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: IDLE_CONFIG,
      useValue: {
        timeoutMs: 5 * 60 * 1000, // 5 minutes (300 seconds)
        gracePeriodMs: 10 * 1000, // 10 seconds before expiration
        checkIntervalMs: 1000 // Check every 1 second
      } as IdleConfig
    },
    {
      // Single initializer: restore auth first, then restore terminal context.
      // Sequential (not parallel) so terminal context always uses the most reliable source:
      // - authenticated → current-binding  (has org ID from JWT)
      // - unauthenticated → device-context (anonymous, device_token cookie only)
      provide: APP_INITIALIZER,
      useFactory: (
        authService: AuthService,
        terminalService: TerminalService,
        terminalContext: TerminalContextService
      ) => () => authService.initializeAuth().pipe(
        // initializeAuth() returns EMPTY on failure (no refresh token cookie) —
        // defaultIfEmpty ensures the chain always continues regardless.
        defaultIfEmpty(undefined as void),
        switchMap(() => {
          const isAuthenticated = authService.isAuthenticated();

          if (isAuthenticated) {
            // User has a valid session: use authenticated endpoint which returns full terminal data.
            return terminalService.getCurrentBinding().pipe(
              tap(terminal => {
                if (!terminal) return;
                const orgId = authService.currentUserValue?.organizationId
                           ?? authService.getOrganizationId();
                if (!orgId) return;
                terminalContext.setTerminalContext({
                  terminalId:     terminal.terminalUid,
                  organizationId: orgId,
                  terminalCode:   terminal.terminalCode,
                  location:       terminal.location
                });
                console.debug('[AppInit] Terminal context restored via current-binding:', terminal.terminalCode);
              }),
              catchError(() => EMPTY)
            );
          } else {
            // No active session: use anonymous device-context endpoint (device_token cookie only).
            return terminalService.getDeviceContext().pipe(
              tap(ctx => {
                if (!ctx) return;
                terminalContext.setTerminalContext({
                  terminalId:     ctx.terminalUid,
                  organizationId: ctx.organizationId,
                  terminalCode:   ctx.terminalCode,
                  location:       ctx.location
                });
                console.debug('[AppInit] Terminal context restored via device-context:', ctx.terminalCode);
              }),
              catchError(() => EMPTY)
            );
          }
        }),
        catchError(() => EMPTY)
      ),
      deps: [AuthService, TerminalService, TerminalContextService],
      multi: true
    }
  ]
};
