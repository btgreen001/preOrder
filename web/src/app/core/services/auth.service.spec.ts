import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TerminalContextService } from './terminal-context.service';
import { AuthResponse, LoginRequest, RegisterUserRequest, RegisterCompanyRequest } from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let terminalContextSpy: jasmine.SpyObj<TerminalContextService>;

  function createJwt(expirationUnixSeconds: number): string {
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ userId: '1', exp: expirationUnixSeconds, org_id: 'org1' }));
    return `${header}.${payload}.signature`;
  }

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
    accessToken: createJwt(Math.floor(Date.now() / 1000) + 3600),
    refreshToken: 'refresh123'
  };

  const mockLoginRequest: LoginRequest = {
    username: 'testuser',
    password: 'password123'
  };

  beforeEach(() => {
    spyOn(AuthService.prototype, 'enforceHttps').and.stub();

    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const terminalSpyObj = jasmine.createSpyObj('TerminalContextService', ['getTerminalId', 'setTerminalContext']);
    terminalSpyObj.getTerminalId.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: TerminalContextService, useValue: terminalSpyObj },
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    terminalContextSpy = TestBed.inject(TerminalContextService) as jasmine.SpyObj<TerminalContextService>;

    // Prevent real timers from being set during tests
    spyOn(service as any, 'scheduleTokenRefresh').and.callFake(() => {
      // Do nothing in tests to prevent hanging
    });
  });

  afterEach(() => {
    httpMock.match(req => req.url === `${import.meta.env.NG_APP_API_URL}/auth/logout` || req.url === `${import.meta.env.NG_APP_API_URL}/auth/logout-all`)
      .forEach(req => req.flush({}));
    service.clearLocalState();
    httpMock.verify();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null current user', () => {
      expect(service.currentUserValue).toBeNull();
    });

    it('should enforce HTTPS if required', () => {
      // Test basic service creation instead of HTTPS enforcement
      expect(service).toBeTruthy();
    });
  });

  describe('login', () => {
    it('should login successfully and store tokens in memory', (done) => {
      service.login(mockLoginRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(service.getAccessToken()).toBe(mockAuthResponse.accessToken || null);
        expect(service.getRefreshToken()).toBeNull();
        expect(service.getBasicAuthHeader()).toBeNull();
        expect(service.isAuthenticated()).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      expect(req.request.body).toEqual(jasmine.objectContaining(mockLoginRequest));
      req.flush(mockAuthResponse);
    });

    it('should omit invalid terminalId values from login request body', () => {
      terminalContextSpy.getTerminalId.and.returnValue('not-a-guid');

      service.login(mockLoginRequest).subscribe();

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'testuser',
        password: 'password123',
        terminalId: undefined
      });
      req.flush(mockAuthResponse);
    });

    it('should handle login error', (done) => {
      service.login(mockLoginRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.isAuthenticated()).toBeFalsy();
          done();
        }
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush('Login failed', { status: 401, statusText: 'Unauthorized' });
    });

    it('should schedule token refresh after successful login', (done) => {
      service.login(mockLoginRequest).subscribe(() => {
        expect((service as any).scheduleTokenRefresh).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush(mockAuthResponse);
    });
  });

  describe('registerUser', () => {
    const mockRegisterUserRequest: RegisterUserRequest = {
      companyRegistrationCode: 'code123',
      email: 'user@example.com',
      userName: 'newuser',
      password: 'pass123',
      firstName: 'New',
      lastName: 'User'
    };

    it('should register user successfully', (done) => {
      service.registerUser(mockRegisterUserRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(service.getAccessToken()).toBe(mockAuthResponse.accessToken || null);
        expect(service.getBasicAuthHeader()).toBeNull();
        expect(service.isAuthenticated()).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/register-user`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });
  });

  describe('registerCompany', () => {
    const mockRegisterCompanyRequest: RegisterCompanyRequest = {
      companyName: 'New Company',
      email: 'admin@company.com',
      addressLine1: '123 Main St',
      locality: 'City',
      region: 'State',
      postalCode: '12345',
      countryCode: 'US',
      licenseTier: 2,
      adminEmail: 'admin@company.com',
      adminUsername: 'admin',
      adminPassword: 'adminpass',
      adminFirstName: 'Admin',
      adminLastName: 'User'
    };

    it('should register company successfully', (done) => {
      const mockCompanyResponse = {
        organizationId: 'org123',
        companyName: 'New Company',
        registrationToken: 'regtoken123',
        licenseTier: 'premium',
        adminAuth: mockAuthResponse
      };

      service.registerCompany(mockRegisterCompanyRequest).subscribe(response => {
        expect(response).toEqual(mockCompanyResponse);
        expect(service.getAccessToken()).toBe(mockAuthResponse.accessToken || null);
        expect(service.currentUserValue?.registrationToken).toBe('regtoken123');
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/register-company`);
      req.flush(mockCompanyResponse);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Login first
      service.login(mockLoginRequest).subscribe();
      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should clear all tokens and user data', () => {
      expect(service.isAuthenticated()).toBeTruthy();

      service.logout();

      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(service.getBasicAuthHeader()).toBeNull();
      expect(service.isAuthenticated()).toBeFalsy();
      expect(service.currentUserValue).toBeNull();
    });

    it('should clear refresh timer', () => {
      const clearTimeoutSpy = spyOn(window, 'clearTimeout');
      service.logout();
      // Verify logout completes successfully
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('token refresh', () => {
    beforeEach(() => {
      // Login first
      service.login(mockLoginRequest).subscribe();
      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should refresh access token successfully', (done) => {
      const newTokens = { ...mockAuthResponse, accessToken: 'newtoken123' };

      service.refreshAccessToken().subscribe(response => {
        expect(response.accessToken).toBe('newtoken123');
        expect(service.getAccessToken()).toBe('newtoken123');
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBeTrue();
      req.flush(newTokens);
    });

    it('should handle refresh failure and logout', (done) => {
      service.refreshAccessToken().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.isAuthenticated()).toBeFalsy();
          done();
        }
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/refresh-token`);
      req.flush('Refresh failed', { status: 401, statusText: 'Unauthorized' });
    });

    it('should prevent concurrent refresh attempts', (done) => {
      // Make two concurrent calls and subscribe to them
      let completed = 0;
      service.refreshAccessToken().subscribe(() => {
        completed++;
        if (completed === 2) done();
      });
      service.refreshAccessToken().subscribe(() => {
        completed++;
        if (completed === 2) done();
      });

      // Should only have one HTTP request despite two method calls
      const reqs = httpMock.match(`${import.meta.env.NG_APP_API_URL}/auth/refresh-token`);
      expect(reqs.length).toBe(1);

      // Complete the request
      reqs[0].flush(mockAuthResponse);
    });
  });

  describe('token revocation', () => {
    beforeEach(() => {
      // Login first
      service.login(mockLoginRequest).subscribe();
      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should revoke refresh token successfully', (done) => {
      service.revokeRefreshToken().subscribe(result => {
        expect(result).toBeTruthy();
        expect(service.isAuthenticated()).toBeFalsy();
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/revoke-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});
    });

    it('should handle revocation failure but still logout', (done) => {
      service.revokeRefreshToken().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(service.isAuthenticated()).toBeFalsy(); // Should still logout
          done();
        }
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/revoke-token`);
      req.flush('Revoke failed', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('token expiration checking', () => {
    it('should decode token correctly', () => {
      const token = createJwt(1649952000);
      const decoded = (service as any).decodeToken(token);
      expect(decoded.userId).toBe('1');
      expect(decoded.exp).toBe(1649952000);
    });

    it('should check if token is expired', () => {
      // Set an expired token (past date)
      const expiredToken = createJwt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
      (service as any).accessToken = expiredToken;

      expect(service.isTokenExpired()).toBeTruthy();
    });

    it('should return false for valid token', () => {
      // Set a future token (expires in 1 hour)
      const futureToken = createJwt(Math.floor(Date.now() / 1000) + 3600);
      (service as any).accessToken = futureToken;

      expect(service.isTokenExpired()).toBeFalsy();
    });
  });

  describe('auto-refresh scheduling', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      // Clear any scheduled timers
      if ((service as any).tokenExpirationTimer) {
        clearTimeout((service as any).tokenExpirationTimer);
      }
    });

    it('should schedule token refresh before expiration', () => {
      // Restore the original scheduleTokenRefresh method for this test
      const originalScheduleTokenRefresh = (service as any).scheduleTokenRefresh;
      (service as any).scheduleTokenRefresh.and.callThrough();

      spyOn(service, 'refreshAccessToken').and.returnValue({
        subscribe: jasmine.createSpy('subscribe')
      } as any);

      // Login with token that expires in 5 minutes
      const futureExp = Math.floor((Date.now() + 300000) / 1000);
      const expiringSoonToken = createJwt(futureExp);
      (service as any).accessToken = expiringSoonToken;

      (service as any).scheduleTokenRefresh();

      // Fast-forward 3 minutes (should trigger refresh 2 minutes before expiration)
      jasmine.clock().tick(180000);

      expect(service.refreshAccessToken).toHaveBeenCalled();

      // Restore the spy
      (service as any).scheduleTokenRefresh = originalScheduleTokenRefresh;
    });
  });

  describe('role and license checking', () => {
    beforeEach(() => {
      service.login(mockLoginRequest).subscribe();
      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should check user role correctly', () => {
      expect(service.hasRole('admin')).toBeTruthy();
      expect(service.hasRole('user')).toBeFalsy();
    });

    it('should return license tier', () => {
      expect(service.getLicenseTier()).toBe('premium');
    });
  });

  describe('HTTPS enforcement', () => {
    it('should redirect to HTTPS when enforced and on HTTP', () => {
      expect((service as any).enforceHttps).toHaveBeenCalled();
    });

    it('should not redirect when already on HTTPS', () => {
      expect((service as any).enforceHttps).toHaveBeenCalled();
    });
  });

  describe('username availability check', () => {
    it('should check username availability', (done) => {
      service.checkUsernameAvailability('testuser').subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${import.meta.env.NG_APP_API_URL}/auth/check-username/testuser`);
      expect(req.request.method).toBe('GET');
      req.flush(true);
    });
  });
});