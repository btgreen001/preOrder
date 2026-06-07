import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService, InventoryAlert } from '../inventory.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-container">
      <header class="page-header">
        <h1>Inventory Alerts</h1>
        <p>Monitor critical inventory conditions and take action</p>
      </header>
    
      @if (loading) {
        <div class="loading">
          <p>Loading alerts...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadAlerts()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="alerts-summary">
          <div class="summary-card">
            <h3>Total Alerts</h3>
            <span class="count">{{ alerts.length }}</span>
          </div>
          <div class="summary-card high">
            <h3>High Priority</h3>
            <span class="count">{{ getAlertCount('high') }}</span>
          </div>
          <div class="summary-card medium">
            <h3>Medium Priority</h3>
            <span class="count">{{ getAlertCount('medium') }}</span>
          </div>
          <div class="summary-card low">
            <h3>Low Priority</h3>
            <span class="count">{{ getAlertCount('low') }}</span>
          </div>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="alerts-list">
          @for (alert of alerts; track alert) {
            <div class="alert-item" [class]="alert.severity">
              <div class="alert-header">
                <span class="alert-type">{{ alert.type | titlecase }}</span>
                <span class="alert-severity" [class]="alert.severity">{{ alert.severity | titlecase }}</span>
              </div>
              <div class="alert-content">
                <h4>{{ alert.itemName }}</h4>
                <p>{{ alert.message }}</p>
                <small>Created: {{ alert.createdDate | date:'short' }}</small>
              </div>
              <div class="alert-actions">
                <button class="btn-view" (click)="viewItem(alert.itemId)">View Item</button>
                <button class="btn-resolve" (click)="resolveAlert(alert.id)">Mark Resolved</button>
              </div>
            </div>
          }
          @if (alerts.length === 0) {
            <div class="no-alerts">
              <p>🎉 No alerts at this time. All inventory is within normal parameters.</p>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .alerts-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header {
      margin-bottom: 30px;
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 600;
    }
    .page-header p {
      color: var(--bakery-text-muted);
      margin: 0;
      font-size: 1.1rem;
    }
    .alerts-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      text-align: center;
      border: 2px solid transparent;
    }
    .summary-card.high { border-color: var(--bakery-error); }
    .summary-card.medium { border-color: var(--bakery-warning); }
    .summary-card.low { border-color: var(--bakery-info); }
    .summary-card h3 {
      margin: 0 0 10px;
      font-size: 0.9rem;
      color: var(--bakery-text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-card .count {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--bakery-text-emph);
    }
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .alert-item {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--bakery-shadow-soft);
      border-left: 4px solid var(--bakery-text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .alert-item.high { border-left-color: var(--bakery-error); }
    .alert-item.medium { border-left-color: var(--bakery-warning); }
    .alert-item.low { border-left-color: var(--bakery-info); }
    .alert-header {
      display: flex;
      gap: 10px;
      align-items: center;
      min-width: 150px;
    }
    .alert-type {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .alert-severity {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .alert-severity.high {
      background: var(--bakery-error);
      color: white;
    }
    .alert-severity.medium {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .alert-severity.low {
      background: var(--bakery-info);
      color: white;
    }
    .alert-content {
      flex: 1;
    }
    .alert-content h4 {
      margin: 0 0 5px;
      color: var(--bakery-text-emph);
      font-size: 1.1rem;
    }
    .alert-content p {
      margin: 0 0 5px;
      color: var(--bakery-text-muted);
    }
    .alert-content small {
      color: var(--bakery-text-muted);
      font-size: 0.8rem;
    }
    .alert-actions {
      display: flex;
      gap: 10px;
      min-width: 180px;
    }
    .btn-view, .btn-resolve, .btn-secondary {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .btn-view {
      background: var(--bakery-info);
      color: white;
    }
    .btn-resolve {
      background: var(--bakery-success);
      color: white;
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-view:hover, .btn-resolve:hover {
      opacity: 0.9;
    }
    .loading, .error {
      text-align: center;
      padding: 40px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .error p {
      color: var(--bakery-error);
      margin-bottom: 15px;
    }
    .no-alerts {
      text-align: center;
      padding: 60px 20px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      color: var(--bakery-success);
      font-size: 1.1rem;
    }
  `]
})
export class AlertsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  alerts: InventoryAlert[] = [];

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load alerts. Please try again.';
        this.loading = false;
        console.error('Error loading alerts:', err);
      }
    });
  }

  getAlertCount(severity: string): number {
    return this.alerts.filter(alert => alert.severity === severity).length;
  }

  viewItem(itemId: string) {
    // Navigate to item details - would need router injection
    console.log('View item:', itemId);
  }

  resolveAlert(alertId: string) {
    // In a real app, this would call an API to mark the alert as resolved
    // For now, just remove it from the local array
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }
}