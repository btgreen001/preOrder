import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { LoadingService } from '../services/loading.service';
import { TerminalContextService } from '../services/terminal-context.service';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let loadingServiceSpy: jasmine.SpyObj<LoadingService>;
  let terminalContextSpy: jasmine.SpyObj<TerminalContextService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getAccessToken',
      'refreshAccessToken',
      'clearLocalState'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const errorSpy = jasmine.createSpyObj('ErrorHandlerService', ['showError', 'logError']);
    const loadingSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide', 'showTokenRefresh']);
    const terminalSpy = jasmine.createSpyObj('TerminalContextService', ['hasTerminalContext']);
    terminalSpy.hasTerminalContext.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        },
        { provide: AuthService, useValue: authSpy },
        { provide: ErrorHandlerService, useValue: errorSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: TerminalContextService, useValue: terminalSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    loadingServiceSpy = TestBed.inject(LoadingService) as jasmine.SpyObj<LoadingService>;
    terminalContextSpy = TestBed.inject(TerminalContextService) as jasmine.SpyObj<TerminalContextService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('request interception', () => {
    it('should add Bearer header when access token is available', () => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});
    });

    it('should not add Authorization header when no auth available', () => {
      authServiceSpy.getAccessToken.and.returnValue(null);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBeNull();
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});
    });
  });

  describe('401 error handling', () => {
    it('should handle 401 error and attempt token refresh', (done) => {
      let currentToken = 'old-token';
      authServiceSpy.getAccessToken.and.callFake(() => currentToken);
      authServiceSpy.refreshAccessToken.and.callFake(() => {
        currentToken = 'new-token';
        return of({} as any);
      });

      httpClient.get('/api/protected').subscribe(response => {
        expect(response).toBeTruthy();
        expect(authServiceSpy.refreshAccessToken).toHaveBeenCalledTimes(1);
        done();
      });

      // First request gets 401
      const firstReq = httpMock.expectOne('/api/protected');
      expect(firstReq.request.headers.get('Authorization')).toBe('Bearer old-token');
      firstReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Retried request with new token
      const retryReq = httpMock.expectOne('/api/protected');
      expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
      retryReq.flush({ data: 'success' });
    });

    it('should clear state and redirect on refresh failure', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');
      authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('Refresh failed')));

      httpClient.get('/api/protected').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(authServiceSpy.clearLocalState).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should not attempt refresh for auth endpoints', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.post('/api/auth/login', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Authentication failed');
          expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('concurrent refresh handling', () => {
    it('should handle concurrent requests during refresh', (done) => {
      let currentToken = 'old-token';
      const refreshSubject = new Subject<any>();
      authServiceSpy.getAccessToken.and.callFake(() => currentToken);
      authServiceSpy.refreshAccessToken.and.returnValue(refreshSubject.asObservable());

      let completed = 0;
      const onComplete = () => {
        completed += 1;
        if (completed === 2) {
          expect(authServiceSpy.refreshAccessToken).toHaveBeenCalledTimes(1);
          done();
        }
      };

      // Make two concurrent requests
      httpClient.get('/api/data1').subscribe(() => onComplete());
      httpClient.get('/api/data2').subscribe(() => onComplete());

      // Both requests get 401
      const reqs = httpMock.match('/api/data1');
      expect(reqs.length).toBe(1);
      reqs[0].flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      const reqs2 = httpMock.match('/api/data2');
      expect(reqs2.length).toBe(1);
      reqs2[0].flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Complete the in-flight refresh and update access token used for retries.
      currentToken = 'new-token';
      refreshSubject.next({});
      refreshSubject.complete();

      // Both original requests should be retried
      const retryReqs1 = httpMock.match('/api/data1');
      expect(retryReqs1.length).toBe(1);
      expect(retryReqs1[0].request.headers.get('Authorization')).toBe('Bearer new-token');
      retryReqs1[0].flush({ data: 'response1' });

      const retryReqs2 = httpMock.match('/api/data2');
      expect(retryReqs2.length).toBe(1);
      expect(retryReqs2[0].request.headers.get('Authorization')).toBe('Bearer new-token');
      retryReqs2[0].flush({ data: 'response2' });
    });
  });

  describe('non-401 errors', () => {
    it('should pass through non-401 errors unchanged', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
          expect(errorHandlerSpy.showError).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should pass through successful responses unchanged', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.get('/api/test').subscribe(response => {
        expect(response).toEqual({ data: 'success' });
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
      req.flush({ data: 'success' });
    });
  });

  describe('auth endpoint handling', () => {
    it('should include bearer token on auth endpoints when token exists', () => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.post('/api/auth/login', { username: 'test', password: 'pass' }).subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
      req.flush({});
    });

    it('should mark public preorder endpoints as anonymous requests', () => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');

      httpClient.get('/api/public/preorders/menu-items').subscribe();

      const req = httpMock.expectOne('/api/public/preorders/menu-items');
      expect(req.request.withCredentials).toBeFalse();
      req.flush({});
    });

    it('should route to pin-signin on refresh failure when terminal context exists', (done) => {
      authServiceSpy.getAccessToken.and.returnValue('token-123');
      authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('Refresh failed')));
      terminalContextSpy.hasTerminalContext.and.returnValue(true);

      httpClient.get('/api/protected').subscribe({
        next: () => fail('Should have failed'),
        error: () => {
          expect(authServiceSpy.clearLocalState).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/pin-signin'], { queryParams: { idleTimeout: 'true' } });
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });
});