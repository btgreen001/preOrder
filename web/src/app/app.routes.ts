import { Routes } from '@angular/router';
import { AuthGuard, AdminGuard } from '../core/auth.guard';

export const routes: Routes = [
	{ path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
	{ path: 'company-register', loadComponent: () => import('./auth/company-register/company-register.component').then(m => m.CompanyRegisterComponent) },

	{ path: 'shop', loadComponent: () => import('./artisan-food/order-builder/order-builder.component').then(m => m.OrderBuilderComponent) },

	{ path: 'admin/dashboard', loadComponent: () => import('./artisan-food/dashboard/dashboard.component').then(m => m.ArtisanDashboardComponent), canActivate: [AuthGuard] },
	{ path: 'admin/events', loadComponent: () => import('./artisan-food/dashboard/dashboard.component').then(m => m.ArtisanDashboardComponent), canActivate: [AuthGuard, AdminGuard] },
	{ path: 'admin/menu', loadComponent: () => import('./features/products/products-list/products-list.component').then(m => m.ProductsListComponent), canActivate: [AuthGuard, AdminGuard] },
	{ path: 'admin/orders', loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent), canActivate: [AuthGuard, AdminGuard] },

	{ path: '', redirectTo: '/shop', pathMatch: 'full' },
	{ path: '**', redirectTo: '/shop' }
];
