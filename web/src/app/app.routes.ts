import { Routes } from '@angular/router';
import { AuthGuard, SystemAdminGuard, AdminGuard, StaffGuard } from '../core/auth.guard';

// Inventory module (bakery) - lazy loaded at /inventory
export const routes: Routes = [
	{ path: 'system-admin', loadComponent: () => import('./system-admin/system-admin.component').then(m => m.SystemAdminComponent), canActivate: [SystemAdminGuard] },
	{ path: 'dashboard', loadComponent: () => import('./artisan-food/dashboard/dashboard.component').then(m => m.ArtisanDashboardComponent), canActivate: [AuthGuard] },
	// Phase 1 - Skeleton APIs
	{ path: 'products/list', loadComponent: () => import('./features/products/products-list/products-list.component').then(m => m.ProductsListComponent), canActivate: [AuthGuard] },
	{ path: 'orders/list', loadComponent: () => import('./features/orders/orders-list/orders-list.component').then(m => m.OrdersListComponent), canActivate: [AuthGuard] },
	{ path: 'inventory/list', loadComponent: () => import('./features/inventory/inventory-list/inventory-list.component').then(m => m.InventoryListComponent), canActivate: [AuthGuard] },
	{ path: 'inventory', redirectTo: '/inventory/list', pathMatch: 'full' },

	// Order Management - CONSOLIDATED
	{ path: 'orders/builder', loadComponent: () => import('./artisan-food/order-builder/order-builder.component').then(m => m.OrderBuilderComponent), canActivate: [AuthGuard] },
	{ path: 'orders/detail/:externalId', loadComponent: () => import('./features/orders/order-detail/order-detail').then(m => m.OrderDetailComponent), canActivate: [AuthGuard] },
	{ path: 'orders/edit/:externalId', loadComponent: () => import('./features/orders/order-edit/order-edit').then(m => m.OrderEditComponent), canActivate: [AuthGuard] },
	// Phase 2 - Business Logic - Inventory
	{ path: 'inventory/low-stock', loadComponent: () => import('./inventory/low-stock/low-stock-items.component').then(m => m.LowStockItemsComponent), canActivate: [AuthGuard] },
	{ path: 'inventory/expiring', loadComponent: () => import('./inventory/expiring/expiring-items.component').then(m => m.ExpiringItemsComponent), canActivate: [AuthGuard] },
	{ path: 'inventory/reservations', loadComponent: () => import('./inventory/reservations/reservations.component').then(m => m.ReservationsComponent), canActivate: [AuthGuard] },
	{ path: 'unit-conversion', loadComponent: () => import('./features/unit-conversions/manage/unit-conversion-manage.component').then(m => m.UnitConversionManageComponent), canActivate: [AuthGuard, AdminGuard] },
	// Phase 3.3.2 - Inventory Depletion
	{ path: 'inventory/depletion-history', loadComponent: () => import('./features/inventory/depletion/depletion-history.component').then(m => m.DepletionHistoryComponent), canActivate: [AuthGuard] },
	{ path: 'inventory/warnings', loadComponent: () => import('./features/inventory/depletion/inventory-warnings.component').then(m => m.InventoryWarningsComponent), canActivate: [AuthGuard] },
	// Phase 2 - Business Logic - Orders
	{ path: 'orders/validate-inventory', loadComponent: () => import('./features/orders/validate-inventory/validate-inventory.component').then(m => m.ValidateInventoryComponent), canActivate: [AuthGuard] },
	{ path: 'orders/check-availability', loadComponent: () => import('./features/orders/check-availability/check-availability.component').then(m => m.CheckAvailabilityComponent), canActivate: [AuthGuard] },
	{ path: 'orders/pick-list', loadComponent: () => import('./features/orders/pick-list/pick-list.component').then(m => m.PickListComponent), canActivate: [AuthGuard] },
	{ path: 'orders/completion', loadComponent: () => import('./features/orders/completion/completion.component').then(m => m.CompletionComponent), canActivate: [AuthGuard] },
	{ path: 'orders/cancellation', loadComponent: () => import('./features/orders/cancellation/cancellation.component').then(m => m.CancellationComponent), canActivate: [AuthGuard] },
	{ path: 'orders/by-status', loadComponent: () => import('./features/orders/status-filter/status-filter.component').then(m => m.StatusFilterComponent), canActivate: [AuthGuard] },
	// Phase 3.1 - Recipes
	{ path: 'recipes/list', loadComponent: () => import('./features/recipes/list/recipe-list.component').then(m => m.RecipeListComponent), canActivate: [AuthGuard, StaffGuard] },
	{ path: 'recipes/add', loadComponent: () => import('./features/recipes/editor/recipe-editor.component').then(m => m.RecipeEditorComponent), canActivate: [AuthGuard, AdminGuard] },
	{ path: 'recipes/view/:externalId', loadComponent: () => import('./features/recipes/editor/recipe-editor.component').then(m => m.RecipeEditorComponent), canActivate: [AuthGuard,StaffGuard], data: { viewOnly: true } },
	{ path: 'recipes/cook/:externalId', loadComponent: () => import('./features/recipes/editor/recipe-editor.component').then(m => m.RecipeEditorComponent), canActivate: [AuthGuard, StaffGuard], data: { viewOnly: true, cookMode: true } },
	{ path: 'recipes/edit/:externalId', loadComponent: () => import('./features/recipes/editor/recipe-editor.component').then(m => m.RecipeEditorComponent), canActivate: [AuthGuard, AdminGuard] },
//	{ path: 'recipes/builder/new', redirectTo: '/recipes/add', pathMatch: 'full' },
//	{ path: 'recipes/builder/:externalId', loadComponent: () => import('./features/recipes/components/recipe-builder/recipe-builder.component').then(m => m.RecipeBuilderComponent), canActivate: [AuthGuard] },
	{ path: 'recipes/:recipeId/ingredients', loadComponent: () => import('./features/recipes/ingredients/recipe-ingredients.component').then(m => m.RecipeIngredientsComponent), canActivate: [AuthGuard] },
	{ path: 'recipes', redirectTo: '/recipes/list', pathMatch: 'full' },
	// Phase 3.1 - Batches
	{ path: 'batches/list', loadComponent: () => import('./features/batches/list/batch-list.component').then(m => m.BatchListComponent), canActivate: [AuthGuard] },
	{ path: 'batches/add', loadComponent: () => import('./features/batches/editor/batch-editor.component').then(m => m.BatchEditorComponent), canActivate: [AuthGuard] },
	{ path: 'batches/detail/:externalId', loadComponent: () => import('./features/batches/editor/batch-editor.component').then(m => m.BatchEditorComponent), canActivate: [AuthGuard] },
	{ path: 'batches/edit/:externalId', loadComponent: () => import('./features/batches/editor/batch-editor.component').then(m => m.BatchEditorComponent), canActivate: [AuthGuard] },
	{ path: 'batches', redirectTo: '/batches/list', pathMatch: 'full' },
	// Phase 3.2.3 - FIFO Inventory Rotation
	{ path: 'batches/fifo', loadComponent: () => import('./features/batches/fifo/fifo-batches.component').then(m => m.FIFOBatchesComponent), canActivate: [AuthGuard] },
	// Phase 3.1 - Waste
	{ path: 'waste/log', loadComponent: () => import('./features/waste/logger/waste-logger.component').then(m => m.WasteLoggerComponent), canActivate: [AuthGuard] },
	{ path: 'waste/list', loadComponent: () => import('./features/waste/list/waste-list.component').then(m => m.WasteListComponent), canActivate: [AuthGuard] },
	{ path: 'waste/analytics', loadComponent: () => import('./features/waste/analytics/waste-analytics.component').then(m => m.WasteAnalyticsComponent), canActivate: [AuthGuard] },
	{ path: 'waste', redirectTo: '/waste/list', pathMatch: 'full' },
	// Phase 3.3.1 - Production Tasks
	{ path: 'production/tasks', loadComponent: () => import('./features/production/tasks/task-list/task-list.component').then(m => m.TaskListComponent), canActivate: [AuthGuard] },
	// Phase 3.3.3 - Production Dashboard
	{ path: 'production/dashboard', loadComponent: () => import('./features/production/components/production-dashboard.component').then(m => m.ProductionDashboardComponent), canActivate: [AuthGuard] },
	{ path: 'production', redirectTo: '/production/dashboard', pathMatch: 'full' },
	{ path: 'products', loadComponent: () => import('./artisan-food/product-catalog/product-catalog.component').then(m => m.ProductCatalogComponent), canActivate: [AuthGuard] },
	{ path: 'reporting', loadComponent: () => import('./artisan-food/reporting/reporting.component').then(m => m.ReportingComponent), canActivate: [AuthGuard] },
	{ path: 'data-export', loadComponent: () => import('./artisan-food/data-export/data-export.component').then(m => m.DataExportComponent), canActivate: [AuthGuard] },
	{ path: 'calendar', loadComponent: () => import('./artisan-food/production-calendar/production-calendar.component').then(m => m.ProductionCalendarComponent), canActivate: [AuthGuard] },
	{ path: 'pick-pack', loadComponent: () => import('./artisan-food/pick-pack/pick-pack-label.component').then(m => m.PickPackLabelComponent), canActivate: [AuthGuard] },
	{ path: 'delivery', loadComponent: () => import('./artisan-food/delivery/delivery-dispatch.component').then(m => m.DeliveryDispatchComponent), canActivate: [AuthGuard] },
	{ path: 'customer-notifications', loadComponent: () => import('./artisan-food/delivery/customer-notifications.component').then(m => m.CustomerNotificationsComponent), canActivate: [AuthGuard] },
	{ path: 'customer-feedback', loadComponent: () => import('./artisan-food/customer-feedback/feedback.component').then(m => m.CustomerFeedbackComponent), canActivate: [AuthGuard] },
	{ path: 'quick-order', loadComponent: () => import('./artisan-food/quick-order/quick-order-entry.component').then(m => m.QuickOrderEntryComponent), canActivate: [AuthGuard] },
	{ path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
	{ path: 'terminal-selection', loadComponent: () => import('./auth/terminal-selection/terminal-selection.component').then(m => m.TerminalSelectionComponent), canActivate: [AuthGuard] },
	{ path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
	{ path: 'company-register', loadComponent: () => import('./auth/company-register/company-register.component').then(m => m.CompanyRegisterComponent) },
	{ path: 'pin-signin', loadComponent: () => import('./features/pin-signin/pin-signin.component').then(m => m.PinSigninComponent) },
	// Phase 4 - PIN Admin
	{ path: 'pin-admin/dashboard', loadComponent: () => import('./features/pin-admin/dashboard/pin-admin-dashboard.component').then(m => m.PinAdminDashboardComponent), canActivate: [AuthGuard] },
	{ path: 'pin-admin/users', loadComponent: () => import('./features/pin-admin/user-management/pin-user-management.component').then(m => m.PinUserManagementComponent), canActivate: [AuthGuard] },
	{ path: 'pin-admin/audit-logs', loadComponent: () => import('./features/pin-admin/audit-log/pin-audit-log-viewer.component').then(m => m.PinAuditLogViewerComponent), canActivate: [AuthGuard] },
	{ path: 'pin-admin/sessions', loadComponent: () => import('./features/pin-admin/session-monitor/pin-session-monitor.component').then(m => m.PinSessionMonitorComponent), canActivate: [AuthGuard] },
	{ path: 'pin-admin', redirectTo: '/pin-admin/dashboard', pathMatch: 'full' },
	// Terminal Management
	{ path: 'terminals/create', loadComponent: () => import('./features/terminals/terminal-form/terminal-form.component').then(m => m.TerminalFormComponent), canActivate: [AuthGuard] },
	{ path: 'terminals/edit/:id', loadComponent: () => import('./features/terminals/terminal-form/terminal-form.component').then(m => m.TerminalFormComponent), canActivate: [AuthGuard] },
	{ path: 'terminals/delete/:id', loadComponent: () => import('./features/terminals/terminal-delete-confirm/terminal-delete-confirm.component').then(m => m.TerminalDeleteConfirmComponent), canActivate: [AuthGuard] },
	{ path: 'terminals', loadComponent: () => import('./features/terminals/terminal-list/terminal-list.component').then(m => m.TerminalListComponent), canActivate: [AuthGuard] },
	{ path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];
