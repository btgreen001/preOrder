import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InventoryService, InventorySummary, InventoryAlert } from '../inventory.service';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.scss']
})
export class InventoryDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  summary: InventorySummary = {
    totalItems: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalValue: 0,
    categoriesCount: 0,
    suppliersCount: 0
  };

  alerts: InventoryAlert[] = [];
  loading = false;
  error = '';

  quickActions = [
    { title: 'Scan Items', route: '/inventory/scan', icon: '📱', description: 'Quick barcode scanning' },
    { title: 'View All Items', route: '/inventory/items', icon: '📋', description: 'Complete item list' },
    { title: 'Manage Suppliers', route: '/inventory/suppliers', icon: '🏢', description: 'Supplier management' },
    { title: 'Manage Categories', route: '/inventory/categories', icon: '📂', description: 'Item categories' },
    { title: 'Check Alerts', route: '/inventory/alerts', icon: '⚠️', description: 'Low stock & expiring' },
    { title: 'Record Waste', route: '/inventory/waste', icon: '🗑️', description: 'Track losses' },
    { title: 'Waste Analytics', route: '/waste/analytics', icon: '📉', description: 'Analyze waste trends' },
    { title: 'Batch Tracking', route: '/inventory/batches', icon: '📦', description: 'Inventory batches' },
    { title: 'Production Calendar', route: '/calendar', icon: '📅', description: 'Production scheduling' },
    { title: 'Reports', route: '/inventory/reports', icon: '📊', description: 'Analytics & insights' }
  ];

  ngOnInit(): void {
    this.loading = true;
    this.error = '';

    this.inventoryService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {
        this.error = 'Unable to load inventory summary right now.';
      }
    });

    this.inventoryService.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: () => {
        this.alerts = [];
        this.loading = false;
      }
    });
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'low-stock': return '⚠️';
      case 'expiring-soon': return '⏰';
      case 'out-of-stock': return '🚫';
      default: return 'ℹ️';
    }
  }

  getAlertSeverityClass(severity: string): string {
    switch (severity) {
      case 'high': return 'alert-high';
      case 'medium': return 'alert-medium';
      case 'low': return 'alert-low';
      default: return '';
    }
  }

  navigateToCategories() {
    this.router.navigate(['/inventory/categories']);
  }

  navigateToSuppliers() {
    this.router.navigate(['/inventory/suppliers']);
  }

  navigateToItems() {
    this.router.navigate(['/inventory/items']);
  }

  navigateToLowStock() {
    this.router.navigate(['/inventory/low-stock']);
  }

  navigateToExpiring() {
    this.router.navigate(['/inventory/expiring']);
  }

  navigateToReports() {
    this.router.navigate(['/inventory/reports']);
  }

  navigateToWasteAnalytics() {
    this.router.navigate(['/waste/analytics']);
  }
}
