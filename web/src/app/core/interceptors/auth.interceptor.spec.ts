import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth.model';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockAuthResponse: AuthResponse = {
    userId: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    organizationId: 'org1',
    organizationName: 'Test Org',
    licenseTier: 'premium',
    registrationToken: 'token123',
    accessToken: 'newtoken123',
    refreshToken: 'newrefresh123'
  };

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getBasicAuthHeader',
      'refreshAccessToken',
      'logout',
      'getRefreshToken'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('request interception', () => {
    it('should add Basic Auth header when available', () => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      req.flush({});
    });

    it('should not add Authorization header when no auth available', () => {
      authServiceSpy.getBasicAuthHeader.and.returnValue(null);

      httpClient.get('/api/test').subscribe();

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });
  });

  describe('401 error handling', () => {
    beforeEach(() => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      authServiceSpy.getRefreshToken.and.returnValue('refresh123');
    });

    it('should handle 401 error and attempt token refresh', (done) => {
      authServiceSpy.refreshAccessToken.and.returnValue(of(mockAuthResponse));

      httpClient.get('/api/protected').subscribe(response => {
        expect(response).toBeTruthy();
        done();
      });

      // First request gets 401
      const firstReq = httpMock.expectOne('/api/protected');
      firstReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Refresh request
      const refreshReq = httpMock.expectOne('https://localhost:5124/api/auth/refresh');
      expect(refreshReq.request.method).toBe('POST');
      refreshReq.flush(mockAuthResponse);

      // Retried request with new token
      const retryReq = httpMock.expectOne('/api/protected');
      expect(retryReq.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      retryReq.flush({ data: 'success' });
    });

    it('should logout and redirect on refresh failure', (done) => {
      authServiceSpy.refreshAccessToken.and.returnValue(throwError(() => new Error('Refresh failed')));

      httpClient.get('/api/protected').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Authentication failed');
          expect(authServiceSpy.logout).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should not attempt refresh for auth endpoints', (done) => {
      httpClient.post('/api/auth/login', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Authentication failed');
          expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
          expect(authServiceSpy.logout).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should logout immediately if no refresh token available', (done) => {
      authServiceSpy.getRefreshToken.and.returnValue(null);

      httpClient.get('/api/protected').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('No refresh token available');
          expect(authServiceSpy.logout).toHaveBeenCalled();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
          done();
        }
      });

      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('concurrent refresh handling', () => {
    beforeEach(() => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      authServiceSpy.getRefreshToken.and.returnValue('refresh123');
    });

    it('should handle concurrent requests during refresh', (done) => {
      authServiceSpy.refreshAccessToken.and.returnValue(of(mockAuthResponse));

      // Make two concurrent requests
      httpClient.get('/api/data1').subscribe();
      httpClient.get('/api/data2').subscribe();

      // Both requests get 401
      const reqs = httpMock.match('/api/data1');
      expect(reqs.length).toBe(1);
      reqs[0].flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      const reqs2 = httpMock.match('/api/data2');
      expect(reqs2.length).toBe(1);
      reqs2[0].flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Only one refresh request should be made
      const refreshReqs = httpMock.match('https://localhost:5124/api/auth/refresh');
      expect(refreshReqs.length).toBe(1);
      refreshReqs[0].flush(mockAuthResponse);

      // Both original requests should be retried
      const retryReqs1 = httpMock.match('/api/data1');
      expect(retryReqs1.length).toBe(1);
      retryReqs1[0].flush({ data: 'response1' });

      const retryReqs2 = httpMock.match('/api/data2');
      expect(retryReqs2.length).toBe(1);
      retryReqs2[0].flush({ data: 'response2' });

      done();
    });
  });

  describe('non-401 errors', () => {
    it('should pass through non-401 errors unchanged', (done) => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(authServiceSpy.refreshAccessToken).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should pass through successful responses unchanged', (done) => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');

      httpClient.get('/api/test').subscribe(response => {
        expect(response).toEqual({ data: 'success' });
        done();
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      req.flush({ data: 'success' });
    });
  });

  describe('auth endpoint handling', () => {
    it('should add auth header to auth endpoints', () => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');

      httpClient.post('/api/auth/login', { username: 'test', password: 'pass' }).subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      req.flush({});
    });

    it('should handle auth endpoints with different paths', () => {
      authServiceSpy.getBasicAuthHeader.and.returnValue('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');

      httpClient.post('/api/auth/register-user', {}).subscribe();
      httpClient.post('/api/auth/refresh', {}).subscribe();
      httpClient.post('/api/auth/revoke', {}).subscribe();

      const loginReq = httpMock.expectOne('/api/auth/register-user');
      expect(loginReq.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      loginReq.flush({});

      const refreshReq = httpMock.expectOne('https://localhost:5124/api/auth/refresh');
      expect(refreshReq.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      refreshReq.flush({});

      const revokeReq = httpMock.expectOne('https://localhost:5124/api/auth/revoke');
      expect(revokeReq.request.headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6cGFzc3dvcmQ=');
      revokeReq.flush({});
    });
  });
});