
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

  protected readonly title = signal('Artisan Food Order Management');
  currentRole: UserRole = 'customer'; // Default fallback
  sidebarNav: { label: string, route: string, roles: UserRole[], icon: string, isChild?: boolean }[] = [];

  private allNavItems = [
    { label: 'Dashboard',           route: '/dashboard',                    roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'dashboard' },
    { label: 'Orders',              route: '/orders/list',                  roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'customer'] as UserRole[],               icon: 'receipt_long' },
    { label: 'Order Builder',       route: '/orders/builder',               roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'customer'] as UserRole[],               icon: 'add_shopping_cart',   isChild: true },

    // Phase 2 - Orders Business Logic
    { label: 'Validate Inventory',  route: '/orders/validate-inventory',    roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'inventory',           isChild: true },
    { label: 'Check Availability',  route: '/orders/check-availability',    roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'event_available',     isChild: true },
    { label: 'Pick List',           route: '/orders/pick-list',             roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'checklist',           isChild: true },
    { label: 'Complete Order',      route: '/orders/completion',            roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'check_circle_outline', isChild: true },
    { label: 'Cancel Order',        route: '/orders/cancellation',          roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'cancel',              isChild: true },
    { label: 'Filter by Status',    route: '/orders/by-status',             roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'filter_list',         isChild: true },

    // Phase 3.1 - Recipes, Batches, Waste
    { label: 'Recipes',             route: '/recipes/list',                      roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'menu_book' },
    { label: 'Batches',             route: '/batches',                      roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'science' },
    { label: 'Batch List',          route: '/batches/list',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'list',                isChild: true },
    { label: 'New Batch',           route: '/batches/add',                  roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'add',                 isChild: true },

    // Inventory Management
    { label: 'Inventory',           route: '/inventory/list',               roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'inventory_2' },
    { label: 'Low Stock',           route: '/inventory/low-stock',          roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'warning_amber',       isChild: true },
    { label: 'Expiring Items',      route: '/inventory/expiring',           roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'schedule',            isChild: true },
    { label: 'Reservations',        route: '/inventory/reservations',       roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'bookmark_outline',    isChild: true },
    { label: 'Items & Scan',        route: '/inventory/items',              roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'qr_code_scanner',     isChild: true },
    { label: 'Inventory Batches',   route: '/inventory/batches',            roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'science',             isChild: true },
    { label: 'Stock Alerts',        route: '/inventory/alerts',             roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'notifications_active', isChild: true },
    { label: 'Inventory Reports',   route: '/inventory/reports',            roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'summarize',           isChild: true },
    { label: 'Unit Conversions',    route: '/inventory/unit-conversions',   roles: ['SystemAdmin', 'CompanyAdmin'] as UserRole[],                                    icon: 'swap_horiz',          isChild: true },


    { label: 'Waste Tracking',      route: '/waste',                        roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'delete_sweep' },
    { label: 'Log Waste',           route: '/waste/log',                    roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'add',                 isChild: true },
    { label: 'Waste List',          route: '/waste/list',                   roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'list',                isChild: true },
    { label: 'Waste Analytics',     route: '/waste/analytics',              roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'analytics',           isChild: true },

    { label: 'Delivery Dispatch',   route: '/delivery',                     roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'local_shipping' },
    { label: 'Product Catalog',     route: '/products',                     roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'storefront' },
    { label: 'Production Calendar', route: '/calendar',                     roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'delivery'] as UserRole[],               icon: 'calendar_month' },
    { label: 'Reporting',           route: '/reporting',                    roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],                           icon: 'bar_chart' },
    { label: 'Communication Hub',   route: '/communication',                roles: ['SystemAdmin', 'CompanyAdmin', 'staff', 'delivery'] as UserRole[],               icon: 'chat_bubble_outline' },


    { label: 'Role Management',     route: '/system-admin',                 roles: ['SystemAdmin'] as UserRole[],                                             icon: 'manage_accounts' },
    { label: 'Data Export',         route: '/data-export',                  roles: ['SystemAdmin', 'CompanyAdmin'] as UserRole[],                                    icon: 'download' },
    { label: 'Storefront',          route: '/storefront',                   roles: ['SystemAdmin', 'customer'] as UserRole[],                                 icon: 'store' },
    { label: 'Order History',       route: '/order-history',                roles: ['SystemAdmin', 'customer'] as UserRole[],                                 icon: 'history' },
    { label: 'Availability',        route: '/availability',                 roles: ['SystemAdmin', 'customer'] as UserRole[],                                 icon: 'event_available' }
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
