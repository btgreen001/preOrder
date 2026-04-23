import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';

const routes: Routes = [
  { path: '', component: InventoryDashboardComponent },
  { path: 'overview', component: InventoryDashboardComponent },
  { path: 'items', loadComponent: () => import('./items/items-list.component').then(m => m.ItemsListComponent) },
  { path: 'items/add', loadComponent: () => import('./items/item-add.component').then(m => m.ItemAddComponent) },
  { path: 'items/:id', loadComponent: () => import('./items/item-detail.component').then(m => m.ItemDetailComponent) },
  { path: 'items/:id/edit', loadComponent: () => import('./items/item-edit.component').then(m => m.ItemEditComponent) },
  { path: 'items/:id/history', loadComponent: () => import('./items/item-history.component').then(m => m.ItemHistoryComponent) },
  { path: 'scan', loadComponent: () => import('./scan/scan.component').then(m => m.ScanComponent) },
  { path: 'scan/receive', loadComponent: () => import('./scan/scan-receive.component').then(m => m.ScanReceiveComponent) },
  { path: 'scan/count', loadComponent: () => import('./scan/scan-count.component').then(m => m.ScanCountComponent) },
  { path: 'scan/waste', loadComponent: () => import('./scan/scan-waste.component').then(m => m.ScanWasteComponent) },
  { path: 'batches', loadComponent: () => import('./batches/batch-list.component').then(m => m.BatchListComponent) },
  { path: 'batches/add', loadComponent: () => import('./batches/batch-add.component').then(m => m.BatchAddComponent) },
  { path: 'batches/:id', loadComponent: () => import('./batches/batch-detail.component').then(m => m.BatchDetailComponent) },
  { path: 'batches/:id/edit', loadComponent: () => import('./batches/batch-edit.component').then(m => m.BatchEditComponent) },
  { path: 'recipes', loadComponent: () => import('./recipes/recipe-list.component').then(m => m.RecipeListComponent) },
  { path: 'recipes/add', loadComponent: () => import('./recipes/recipe-add.component').then(m => m.RecipeAddComponent) },
  { path: 'recipes/:id', loadComponent: () => import('./recipes/recipe-detail.component').then(m => m.RecipeDetailComponent) },
  { path: 'recipes/:id/edit', loadComponent: () => import('./recipes/recipe-edit.component').then(m => m.RecipeEditComponent) },
  { path: 'recipes/:id/cost', loadComponent: () => import('./recipes/recipe-cost.component').then(m => m.RecipeCostComponent) },
  { path: 'alerts', loadComponent: () => import('./alerts/alerts.component').then(m => m.AlertsComponent) },
  { path: 'expiring', loadComponent: () => import('./expiring/expiring-items.component').then(m => m.ExpiringItemsComponent) },
  { path: 'low-stock', loadComponent: () => import('./low-stock/low-stock-items.component').then(m => m.LowStockItemsComponent) },
  { path: 'waste', loadComponent: () => import('./waste/waste-tracking.component').then(m => m.WasteTrackingComponent) },
  { path: 'reconcile', loadComponent: () => import('./reconcile/reconcile.component').then(m => m.ReconcileComponent) },
  { path: 'reports', loadComponent: () => import('./reports/reports-dashboard.component').then(m => m.ReportsDashboardComponent) },
  { path: 'reports/turnover', loadComponent: () => import('./reports/turnover-report.component').then(m => m.TurnoverReportComponent) },
  { path: 'reports/costing', loadComponent: () => import('./reports/costing-report.component').then(m => m.CostingReportComponent) },
  { path: 'reports/efficiency', loadComponent: () => import('./reports/efficiency-report.component').then(m => m.EfficiencyReportComponent) },
  { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'suppliers', loadComponent: () => import('./suppliers/suppliers.component').then(m => m.SuppliersComponent) },
  { path: 'suppliers/add', loadComponent: () => import('./suppliers/supplier-add/supplier-add').then(m => m.SupplierAddComponent) },
  { path: 'suppliers/:id', loadComponent: () => import('./suppliers/supplier-detail/supplier-detail').then(m => m.SupplierDetailComponent) },
  { path: 'suppliers/:id/edit', loadComponent: () => import('./suppliers/supplier-edit/supplier-edit').then(m => m.SupplierEditComponent) },
  { path: 'categories', loadComponent: () => import('./categories/categories.component').then(m => m.CategoriesComponent) },
  { path: 'categories/add', loadComponent: () => import('./categories/category-add/category-add').then(m => m.CategoryAddComponent) },
  { path: 'categories/:id', loadComponent: () => import('./categories/category-detail/category-detail').then(m => m.CategoryDetailComponent) },
  { path: 'categories/:id/edit', loadComponent: () => import('./categories/category-edit/category-edit').then(m => m.CategoryEditComponent) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule {}
