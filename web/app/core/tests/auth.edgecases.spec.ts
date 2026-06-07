import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TerminalContextService } from '../services/terminal-context.service';
import { AuthInterceptor } from '../interceptors/auth.interceptor';

describe('Auth edge cases', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;

  function createJwt(expirationUnixSeconds: number): string {
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ userId: '1', exp: expirationUnixSeconds }));
    return `${header}.${payload}.signature`;
  }

  beforeEach(() => {
    spyOn(AuthService.prototype, 'enforceHttps').and.stub();

    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const terminalSpyObj = jasmine.createSpyObj('TerminalContextService', ['getTerminalId', 'hasTerminalContext', 'setTerminalContext']);
    terminalSpyObj.getTerminalId.and.returnValue(null);
    terminalSpyObj.hasTerminalContext.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: TerminalContextService, useValue: terminalSpyObj },
        { provide: Router, useValue: routerSpyObj },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.match(req => req.url.endsWith('/auth/logout') || req.url.endsWith('/auth/logout-all'))
      .forEach(req => req.flush({}));
    authService.clearLocalState();
    httpMock.verify();
  });

  it('should handle malformed token during decode gracefully', () => {
    (authService as any).accessToken = 'not-a-base64';
    const decoded = (authService as any).decodeToken((authService as any).accessToken);
    expect(decoded).toBeNull();
    expect(authService.isTokenExpired()).toBeTrue();
  });

  it('should handle refresh called with no refresh token and not crash', () => {
    let thrown = false;
    try {
      authService.refreshAccessToken().subscribe({
        error: () => {}
      });
      const req = httpMock.expectOne((req) => req.url.includes('/auth/refresh-token'));
      req.flush('Refresh failed', { status: 401, statusText: 'Unauthorized' });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBeFalse();
  });

  it('should handle network failure during refresh and logout', (done) => {
    spyOn(authService as any, 'logout').and.callThrough();

    authService.refreshAccessToken().subscribe({
      next: () => fail('Should not succeed'),
      error: (err) => {
        expect((authService as any).logout).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne((req) => req.url.includes('/auth/refresh-token'));
    req.error(new ErrorEvent('Network error'));
  });

  it('interceptor should retry after refresh and preserve original headers', (done) => {
    (authService as any).accessToken = createJwt(Math.floor(Date.now() / 1000) + 3600);

    // Spy refresh to simulate cookie-backed refresh and set new in-memory access token.
    spyOn(authService, 'refreshAccessToken').and.callFake(() => {
      (authService as any).accessToken = 'newtoken';
      return of({
        userId: '1',
        username: 'u',
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        organizationId: '',
        organizationName: '',
        licenseTier: 'basic',
        registrationToken: '',
        accessToken: 'newtoken'
      } as any);
    });

    httpClient.get('/api/protected').subscribe({
      next: (resp) => {
        expect(resp).toBeTruthy();
        done();
      }
    });

    // First request returns 401
    const first = httpMock.expectOne('/api/protected');
    expect(first.request.headers.get('Authorization')).toContain('Bearer');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Retried original request
    const retry = httpMock.expectOne('/api/protected');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer newtoken');
    retry.flush({ ok: true });
  });

  it('revokeRefreshToken should logout even on server error', (done) => {
    spyOn(authService, 'logout').and.callThrough();

    authService.revokeRefreshToken().subscribe({
      next: () => fail('Should have error'),
      error: () => {
        expect(authService.logout).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/auth/revoke-token');
    expect(req.request.withCredentials).toBeTrue();
    req.flush('err', { status: 500, statusText: 'Server Error' });
  });
});
