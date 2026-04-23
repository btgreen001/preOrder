import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../app/core/services/auth.service';
import { TerminalContextService } from '../app/core/services/terminal-context.service';


export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const terminalContextService = inject(TerminalContextService);
  
  if (state.url === '/login' || state.url === '/register' || state.url === '/company-register') {
    return true;
  }
  
  // Check if user is authenticated (has valid access token)
  // Don't rely on currentUserValue since it's only set after login completes
  if (!authService.isAuthenticated()) {
    // If a terminal is already bound (Change User flow), go to PIN sign-in
    // If explicitly logged out, terminal context will have been cleared → go to login
    if (terminalContextService.hasTerminalContext()) {
      router.navigate(['/pin-signin']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }
  
  return true;
};

export const SystemAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const user = authService.currentUserValue;
  if (!user || user.role !== 'SystemAdmin') {
    window.location.href = '/login';
    return false;
  }
  return true;
};

/** Allows Staff (role='staff') and SystemAdmin only. Redirects to /dashboard on failure. */
export const StaffGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUserValue;
  const role = user?.role;
  const isStaff = role === 'staff' || role === 'SystemAdmin' || role === 'CompanyAdmin';
  if (!user || !isStaff) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

/** Allows CompanyAdmin (role='admin') and SystemAdmin only. Redirects to /recipes on failure. */
export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUserValue;
  const role = user?.role;
  const isAdmin = role === 'admin' || role === 'SystemAdmin' || role === 'CompanyAdmin';
  if (!user || !isAdmin) {
    return false;
  }
  return true;
};
