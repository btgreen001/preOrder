import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard, StaffGuard } from '../core/auth.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
	{ path: 'company-register', loadComponent: () => import('./auth/company-register/company-register.component').then(m => m.CompanyRegisterComponent) },
	{ path: 'forgot-password', loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
	{ path: 'reset-password', loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
	{ path: 'profile', loadComponent: () => import('./auth/profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] },
	{ path: 'admin/company-profile', loadComponent: () => import('./auth/company-profile/company-profile.component').then(m => m.CompanyProfileComponent), canActivate: [AuthGuard, AdminGuard] },
	{ path: 'BakeAhead', loadComponent: () => import('./artisan-food/order-builder/order-builder.component').then(m => m.OrderBuilderComponent) },
	{ path: 'shop', redirectTo: '/BakeAhead', pathMatch: 'full' },

	{ path: 'admin/events', loadComponent: () => import('./features/preorder-admin/events/preorder-events-admin.component').then(m => m.PreorderEventsAdminComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'dashboard', loadComponent: () => import('./features/preorder-admin/events/preorder-events-admin.component').then(m => m.PreorderEventsAdminComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'admin/menu', loadComponent: () => import('./features/preorder-admin/menu/preorder-menu-admin.component').then(m => m.PreorderMenuAdminComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'admin/slots', loadComponent: () => import('./features/preorder-admin/slots/preorder-slots-admin.component').then(m => m.PreorderSlotsAdminComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'admin/orders', loadComponent: () => import('./features/preorder-admin/orders/preorder-orders-admin.component').then(m => m.PreorderOrdersAdminComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'admin/invites', loadComponent: () => import('./features/preorder-admin/invites/admin-invites.component').then(m => m.AdminInvitesComponent), canActivate: [AuthGuard, AdminGuard] },

	{ path: 'preorders/external', loadComponent: () => import('./features/orders/pre-order-detail/pre-order-detail').then(m => m.OrderDetailComponent) },
	{ path: 'preorders/external/:id', loadComponent: () => import('./features/orders/pre-order-detail/pre-order-detail').then(m => m.OrderDetailComponent) },
//	{ path: 'preorders/external/cancel/:id', loadComponent: () => import('./features/orders/pre-order-detail/pre-order-detail').then(m => m.OrderDetailComponent) },


	{ path: '', redirectTo: '/BakeAhead', pathMatch: 'full' },
	{ path: '**', redirectTo: '/BakeAhead' }
];
