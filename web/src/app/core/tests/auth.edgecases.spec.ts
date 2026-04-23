import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthInterceptor } from '../interceptors/auth.interceptor';

describe('Auth edge cases', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
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
    httpMock.verify();
    authService.logout();
  });

  it('should handle malformed token during decode gracefully', () => {
    (authService as any).accessToken = 'not-a-base64';
    const decoded = (authService as any).decodeToken((authService as any).accessToken);
    expect(decoded).toBeNull();
    expect(authService.isTokenExpired()).toBeTrue();
  });

  it('should handle refresh called with no refresh token and not crash', () => {
    (authService as any).refreshToken = null;
    let thrown = false;
    try {
      authService.refreshAccessToken().subscribe({
        error: () => {}
      });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBeFalse();
  });

  it('should handle network failure during refresh and logout', (done) => {
    (authService as any).refreshToken = 'refresh123';
    spyOn(authService as any, 'logout').and.callThrough();

    authService.refreshAccessToken().subscribe({
      next: () => fail('Should not succeed'),
      error: (err) => {
        expect((authService as any).logout).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne((req) => req.url.includes('/auth/refresh'));
    req.error(new ErrorEvent('Network error'));
  });

  it('interceptor should retry after refresh and preserve original headers', (done) => {
    // Arrange: set basic auth and refresh token
    (authService as any).basicAuthHeader = 'Basic abc123';
    (authService as any).refreshToken = 'refresh123';

    // Spy refresh to simulate returning new tokens
    spyOn(authService, 'refreshAccessToken').and.returnValue(of({
      userId: '1', username: 'u', email: '', firstName: '', lastName: '', role: 'user', organizationId: '', organizationName: '',
      licenseTier: 'basic', registrationToken: '', accessToken: 'new', refreshToken: 'newrefresh'
    } as any));

    httpClient.get('/api/protected').subscribe({
      next: (resp) => {
        expect(resp).toBeTruthy();
        done();
      }
    });

    // First request returns 401
    const first = httpMock.expectOne('/api/protected');
    first.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Refresh endpoint should be hit
    const refresh = httpMock.expectOne('https://localhost:5124/api/auth/refresh');
    refresh.flush({ accessToken: 'newtoken', refreshToken: 'newrefresh' });

    // Retried original request
    const retry = httpMock.expectOne('/api/protected');
    expect(retry.request.headers.get('Authorization')).toBe('Basic abc123');
    retry.flush({ ok: true });
  });

  it('revokeRefreshToken should logout even on server error', (done) => {
    (authService as any).refreshToken = 'refresh123';
    spyOn(authService, 'logout').and.callThrough();

    authService.revokeRefreshToken().subscribe({
      next: () => fail('Should have error'),
      error: () => {
        expect(authService.logout).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('https://localhost:5124/api/auth/revoke');
    req.flush('err', { status: 500, statusText: 'Server Error' });
  });
});
