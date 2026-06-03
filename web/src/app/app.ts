
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRouteSnapshot } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RoleService, UserRole } from '../shared-data-services/role.service';
import { LicenseService } from '../shared-data-services/license.service';
import { AuthService } from './core/services/auth.service';
import { TerminalContextService } from './core/services/terminal-context.service';
import { TerminalService } from './features/terminals/services/terminal.service';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { Subscription, filter } from 'rxjs';

export type NavItem =
  | {
      label: string;
      route: string;
      roles: UserRole[];
      icon: string;
      action?: 'quick-tour';
      nonInteractive?: boolean;
      isChild?: boolean;
      externalUrl?: undefined;
      dividerBefore?: boolean;
    }
  | {
      label: string;
      externalUrl: string;
      roles: UserRole[];
      icon: string;
      action?: 'quick-tour';
      nonInteractive?: boolean;
      isChild?: boolean;
      route?: undefined;
      dividerBefore?: boolean;
    };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, LoadingOverlayComponent, MatIconModule, MatMenuModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit, OnDestroy {
  private static readonly MOBILE_NAV_BREAKPOINT = 960;
  private static readonly FORCE_TOUR_KEY = 'preorder.forceTour';
  private static readonly FORCE_TOUR_DEBUG_KEY = 'preorder.forceTourDebug';
  private static readonly QUICK_TOUR_EVENT = 'preorder:tour:start';
  private router = inject(Router);
  private roleService = inject(RoleService);
  private licenseService = inject(LicenseService);
  private authService = inject(AuthService);
  private terminalContextService = inject(TerminalContextService);
  private terminalService = inject(TerminalService);
  private userSubscription?: Subscription;
  private routeIdleSyncSubscription?: Subscription;

  protected readonly title = signal('Pre-Order');
  currentRole: UserRole = 'customer'; // Default fallback
  sidebarNav: NavItem[] = [];

//  sidebarNav: { label: string, route: string, roles: UserRole[], icon: string, isChild?: boolean }[] = [];
  showAdminShell = true;
  showStorePreviewLink = false;
  isSidebarOpen = false;

  
  get storePreviewUrl(): string {
    const token = this.authService.currentUserValue?.registrationToken;
    return token ? `/BakeAhead?org=${encodeURIComponent(token)}` : '/login';
  }

  getNavExternalUrl(nav: NavItem): string {
    if (nav.label === 'Store Preview') {
      return this.storePreviewUrl;
    }

    return nav.externalUrl ?? '/login';
  }

  onExternalNavClick(event: MouseEvent, nav: NavItem): void {
    if (nav.label !== 'Store Preview') {
      return;
    }

    event.preventDefault();
    const destination = this.getNavExternalUrl(nav);
    const shouldOpenPreview = window.confirm(
      'Store Preview will open in a new browser tab.\n\nYou are leaving Pre-Order Management to view your storefront.\n\nSelect OK to continue or Cancel to stay here.'
    );

    if (shouldOpenPreview) {
      window.open(destination, '_blank', 'noopener,noreferrer');
    }
  }

  private getAllNavItems(): NavItem[] {
    return [
      { label: 'PreOrder',              route: '/admin/events',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'category', nonInteractive: true },
      { label: 'Events',                route: '/admin/events',   isChild: true,                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'event' },
      { label: 'Items',                 route: '/admin/menu',   isChild: true,                roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'view_list' },
      { label: 'Pickup Slots',          route: '/admin/slots',  isChild: true,                roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'schedule' },
      { label: 'Customer Orders',                route: '/admin/orders',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'receipt_long'},
      { label: 'My Profile',            route: '/profile',                      roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'person' ,dividerBefore: true },
      { label: 'Company Profile',       route: '/admin/company-profile',        roles: ['SystemAdmin', 'CompanyAdmin'] as UserRole[],                     icon: 'business' },
      { label: 'Access Management',     route: '/admin/invites',                roles: ['SystemAdmin', 'CompanyAdmin'] as UserRole[],                     icon: 'person_add' },

      { label: 'Store Preview',         externalUrl: this.storePreviewUrl,      roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'preview', dividerBefore: true},
      { label: 'Quick Tour',            route: '/admin/events',                 roles: ['SystemAdmin', 'CompanyAdmin', 'staff'] as UserRole[],            icon: 'help', dividerBefore: true, action: 'quick-tour' }
    ];
  }

  currentYear = new Date().getFullYear();
  constructor() {
    // Initial setup
    this.updateNavigation();
    this.syncShellForCurrentRoute();
  }
  ngOnInit() {
    // Subscribe to user changes to update navigation when role changes
    this.userSubscription = this.authService.currentUser.subscribe(() => {
      this.updateNavigation();

      // Start idle detection monitoring when user is authenticated.
      // Route sync below will immediately stop it when the active route is cook mode.
 
    });

    this.routeIdleSyncSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.syncShellForCurrentRoute();
      this.resetMainContentScroll();
      this.closeSidebarOnMobile();
    });

    // Apply route-aware state at startup in case the app is loaded directly into a cook route.
    this.syncShellForCurrentRoute();
  }

  ngOnDestroy() {
    // Clean up subscription and stop idle monitoring
    this.userSubscription?.unsubscribe();
    this.routeIdleSyncSubscription?.unsubscribe();
  
  }

  private updateNavigation() {
    this.currentRole = this.roleService.getCurrentRole();
    this.sidebarNav = this.getAllNavItems().filter(nav => nav.roles.includes(this.currentRole));
  }

  private syncShellForCurrentRoute(): void {
    const normalizedUrl = this.router.url.toLowerCase();
    const isStorefrontRoute =
      normalizedUrl === '/bakeahead' ||
      normalizedUrl.startsWith('/bakeahead?') ||
      normalizedUrl.startsWith('/bakeahead/') ||
      normalizedUrl === '/shop' ||
      normalizedUrl.startsWith('/shop?') ||
      normalizedUrl.startsWith('/shop/');

    const isOrderRoute =
      normalizedUrl === '/preorders/external' ||
      normalizedUrl.startsWith('/preorders/external?') ||
      normalizedUrl.startsWith('/preorders/external/');

    const isLoginRoute =
      normalizedUrl === '/login' ||
      normalizedUrl.startsWith('/login?') ||
      normalizedUrl.startsWith('/login/');

          const isRegisterRoute =
      normalizedUrl === '/register' ||
      normalizedUrl === '/company-register' ||
      normalizedUrl === '/forgot-password' ||
      normalizedUrl === '/forgot-username' ||
      normalizedUrl === '/reset-password' ||
      normalizedUrl.startsWith('/company-register?') ||
      normalizedUrl.startsWith('/company-register/') ||
      normalizedUrl.startsWith('/forgot-password?') ||
      normalizedUrl.startsWith('/forgot-password/') ||
      normalizedUrl.startsWith('/forgot-username?') ||
      normalizedUrl.startsWith('/forgot-username/') ||
      normalizedUrl.startsWith('/reset-password?') ||
      normalizedUrl.startsWith('/reset-password/') ||
      normalizedUrl.startsWith('/register?') ||
      normalizedUrl.startsWith('/register/');

    this.showAdminShell = !isStorefrontRoute && !isLoginRoute && !isRegisterRoute && !isOrderRoute;
    if (!this.showAdminShell) {
      this.isSidebarOpen = false;
    }
    this.showStorePreviewLink = normalizedUrl.startsWith('/admin');
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  onSidebarNavClick(nav?: NavItem): void {
    if (nav?.action === 'quick-tour') {
      sessionStorage.setItem(App.FORCE_TOUR_KEY, '1');
      sessionStorage.setItem(App.FORCE_TOUR_DEBUG_KEY, '1');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(App.QUICK_TOUR_EVENT));
      }
    }

    this.closeSidebarOnMobile();
  }

  private closeSidebarOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= App.MOBILE_NAV_BREAKPOINT) {
      this.isSidebarOpen = false;
    }
  }

  private resetMainContentScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();

    const scrollContainer = document.querySelector('.content-scroll') as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
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
    this.terminalService.releaseDeviceContext().subscribe();
    this.authService.logout(false);
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  logoutAllSessions() {
    this.terminalService.releaseDeviceContext().subscribe();
    this.authService.logout(true);
    this.terminalContextService.clearTerminalContext();
    sessionStorage.clear();
    localStorage.clear();
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
