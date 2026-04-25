
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RoleService, UserRole } from '../shared-data-services/role.service';
import { LicenseService } from '../shared-data-services/license.service';
import { AuthService } from './core/services/auth.service';
import { IdleDetectionService } from './core/services/idle-detection.service';
import { TerminalContextService } from './core/services/terminal-context.service';
import { TerminalService } from './features/terminals/services/terminal.service';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, LoadingOverlayComponent, MatIconModule, MatMenuModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private router = inject(Router);
  private roleService = inject(RoleService);
  private licenseService = inject(LicenseService);
  private authService = inject(AuthService);
  private idleDetection = inject(IdleDetectionService);
  private terminalContextService = inject(TerminalContextService);
  private terminalService = inject(TerminalService);
  private userSubscription?: Subscription;
  private routeIdleSyncSubscription?: Subscription;

  protected readonly title = signal('Pre-Order');
  currentRole: UserRole = 'customer'; // Default fallback
  sidebarNav: { label: string, route: string, roles: UserRole[], icon: string, isChild?: boolean }[] = [];

  private allNavItems = [
    { label: 'Events',              route: '/admin/events',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'event' },
    { label: 'Menu',                route: '/admin/menu',                   roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'restaurant_menu' },
    { label: 'Pickup Slots',        route: '/admin/slots',                  roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'schedule' },
    { label: 'Orders',              route: '/admin/orders',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'customer'] as UserRole[],               icon: 'receipt_long' },

    { label: 'Shop (Customer Portal)',                route: '/shop',                         roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'customer'] as UserRole[],               icon: 'add_shopping_cart'}
];

  constructor() {
    // Initial setup
    this.updateNavigation();
  }

  ngOnInit() {
    // Subscribe to user changes to update navigation when role changes
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.updateNavigation();

      // Start idle detection monitoring when user is authenticated.
      // Route sync below will immediately stop it when the active route is cook mode.
      if (user) {
        console.log('[App] User authenticated - starting idle detection');
        this.idleDetection.startMonitoring();
        this.syncIdleMonitoringForCurrentRoute('auth-state-change');
        return;
      }

      this.idleDetection.stopMonitoring();
    });

    this.routeIdleSyncSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.syncIdleMonitoringForCurrentRoute('navigation-end');
    });

    // Apply route-aware state at startup in case the app is loaded directly into a cook route.
    this.syncIdleMonitoringForCurrentRoute('app-init');
  }

  ngOnDestroy() {
    // Clean up subscription and stop idle monitoring
    this.userSubscription?.unsubscribe();
    this.routeIdleSyncSubscription?.unsubscribe();
    this.idleDetection.stopMonitoring();
  }

  private updateNavigation() {
    this.currentRole = this.roleService.getCurrentRole();
    this.sidebarNav = this.allNavItems.filter(nav => nav.roles.includes(this.currentRole));
  }

  private syncIdleMonitoringForCurrentRoute(source: string): void {
    if (!this.authService.currentUserValue) {
      return;
    }

    const inCookModeRoute = this.routeTreeHasCookMode(this.router.routerState.snapshot.root);

    if (inCookModeRoute) {
      this.idleDetection.stopMonitoring();
      return;
    }

    this.idleDetection.startMonitoring();
  }

  private routeTreeHasCookMode(snapshot: ActivatedRouteSnapshot | null): boolean {
    let cursor: ActivatedRouteSnapshot | null = snapshot;
    while (cursor) {
      if (cursor.data?.['cookMode'] === true) {
        return true;
      }
      cursor = cursor.firstChild ?? null;
    }

    return false;
  }

  logoutThisSession() {
    // Release device binding server-side so device-context returns null on next reload.
    // This is the authoritative signal — no client-side flags needed.
    this.terminalService.releaseDeviceContext().subscribe({ error: () => {} });
    this.authService.logout(false);
    this.terminalContextService.clearTerminalContext();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  logoutAllSessions() {
    this.terminalService.releaseDeviceContext().subscribe({ error: () => {} });
    this.authService.logout(true);
    this.terminalContextService.clearTerminalContext();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  changeUser() {
    // APP_INITIALIZER already rehydrated terminal context from device_token cookie on page load.
    // So hasTerminalContext() is always accurate here — no async fallback needed.
    if (this.terminalContextService.hasTerminalContext()) {
      this.authService.logout(false, 'pin-signin');
      this.router.navigate(['/pin-signin']);
    } else {
      this.authService.logout(false, 'login');
      this.router.navigate(['/login']);
    }
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
