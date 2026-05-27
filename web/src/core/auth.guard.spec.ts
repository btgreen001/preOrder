import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard, AdminGuard, StaffGuard } from './auth.guard';
import { AuthService } from '../app/core/services/auth.service';
import { TerminalContextService } from '../app/core/services/terminal-context.service';

describe('Auth guards', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let terminalContextSpy: jasmine.SpyObj<TerminalContextService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated'], {
      currentUserValue: null,
    });
    terminalContextSpy = jasmine.createSpyObj<TerminalContextService>('TerminalContextService', ['hasTerminalContext']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TerminalContextService, useValue: terminalContextSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  function runAuthGuard(url: string): boolean {
    return TestBed.runInInjectionContext(() =>
      AuthGuard({} as any, { url } as any)
    ) as boolean;
  }

  it('allows public auth routes', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    expect(runAuthGuard('/login')).toBeTrue();
    expect(runAuthGuard('/register')).toBeTrue();
    expect(runAuthGuard('/company-register')).toBeTrue();
    expect(runAuthGuard('/forgot-password')).toBeTrue();
    expect(runAuthGuard('/reset-password')).toBeTrue();
  });

  it('redirects unauthenticated users with terminal context to pin signin', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    terminalContextSpy.hasTerminalContext.and.returnValue(true);

    const allowed = runAuthGuard('/admin/events');

    expect(allowed).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/pin-signin']);
  });

  it('redirects unauthenticated users without terminal context to login', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    terminalContextSpy.hasTerminalContext.and.returnValue(false);

    const allowed = runAuthGuard('/admin/events');

    expect(allowed).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('allows authenticated users', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const allowed = runAuthGuard('/admin/events');

    expect(allowed).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  function runStaffGuard(role: string | null): boolean {
    Object.defineProperty(authServiceSpy, 'currentUserValue', {
      get: () => (role ? ({ role } as any) : null),
      configurable: true,
    });

    return TestBed.runInInjectionContext(() =>
      StaffGuard({} as any, { url: '/admin/events' } as any)
    ) as boolean;
  }

  it('staff guard allows staff, company admin, and system admin', () => {
    expect(runStaffGuard('staff')).toBeTrue();
    expect(runStaffGuard('CompanyAdmin')).toBeTrue();
    expect(runStaffGuard('SystemAdmin')).toBeTrue();
  });

  it('staff guard denies non-staff role', () => {
    const allowed = runStaffGuard('customer');

    expect(allowed).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  function runAdminGuard(role: string | null): boolean {
    Object.defineProperty(authServiceSpy, 'currentUserValue', {
      get: () => (role ? ({ role } as any) : null),
      configurable: true,
    });

    return TestBed.runInInjectionContext(() =>
      AdminGuard({} as any, { url: '/admin/invites' } as any)
    ) as boolean;
  }

  it('admin guard allows CompanyAdmin and SystemAdmin', () => {
    expect(runAdminGuard('CompanyAdmin')).toBeTrue();
    expect(runAdminGuard('SystemAdmin')).toBeTrue();
    expect(runAdminGuard('admin')).toBeTrue();
  });

  it('admin guard denies non-admin users', () => {
    const allowed = runAdminGuard('staff');

    expect(allowed).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
