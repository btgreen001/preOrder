import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, InventoryItem } from '../inventory.service';

@Component({
  selector: 'app-expiring-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="expiring-container">
      <header class="page-header">
        <h1>Expiring Items</h1>
        <p>Items approaching expiration dates that require attention</p>
      </header>

      <div class="filters">
        <label>
          Days ahead to check:
          <select [(ngModel)]="daysAhead" (change)="loadExpiringItems()">
            <option [value]="7">7 days</option>
            <option [value]="14">14 days</option>
            <option [value]="30">30 days</option>
            <option [value]="60">60 days</option>
          </select>
        </label>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading expiring items...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadExpiringItems()">Retry</button>
      </div>

      <div class="items-summary" *ngIf="!loading && !error">
        <div class="summary-card">
          <h3>Items Expiring Soon</h3>
          <span class="count">{{ expiringItems.length }}</span>
        </div>
        <div class="summary-card critical">
          <h3>Expiring Within 7 Days</h3>
          <span class="count">{{ getCriticalCount() }}</span>
        </div>
      </div>

      <div class="items-list" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Unit</th>
              <th>Expiration Date</th>
              <th>Days Until Expiry</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of expiringItems" [class]="getUrgencyClass(item)">
              <td>{{ item.name }}</td>
              <td>{{ item.categoryId || 'Uncategorized' }}</td>
              <td>{{ item.quantityOnHand }}</td>
              <td>{{ item.unitOfMeasure }}</td>
              <td>{{ item.expirationDate | date:'shortDate' }}</td>
              <td>
                <span class="days-badge" [class]="getUrgencyClass(item)">
                  {{ getDaysUntilExpiry(item) }} days
                </span>
              </td>
              <td>{{ item.supplierName || 'Unknown' }}</td>
              <td>
                <button class="btn-use" (click)="useItem(item.externalId)">Use First</button>
                <button class="btn-discount" (click)="markForDiscount(item.externalId)">Discount</button>
                <button class="btn-view" (click)="viewItem(item.externalId)">View</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="no-items" *ngIf="expiringItems.length === 0">
          <p>✅ No items expiring within {{ daysAhead }} days. Inventory is fresh!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .expiring-container {
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
    .filters {
      margin-bottom: 20px;
      padding: 15px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .filters label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
      color: var(--bakery-text-emph);
    }
    .filters select {
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    .items-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      text-align: center;
      border: 2px solid var(--bakery-warning);
    }
    .summary-card.critical {
      border-color: var(--bakery-error);
    }
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
    .items-list {
      background: var(--bakery-surface);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--bakery-shadow-soft);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--bakery-accent);
      color: var(--bakery-text-emph);
    }
    th {
      background: var(--bakery-accent-2);
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .critical {
      background-color: rgba(220, 53, 69, 0.1);
    }
    .warning {
      background-color: rgba(255, 193, 7, 0.1);
    }
    .days-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .days-badge.critical {
      background: var(--bakery-error);
      color: white;
    }
    .days-badge.warning {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .days-badge.normal {
      background: var(--bakery-info);
      color: white;
    }
    .btn-use, .btn-discount, .btn-view, .btn-secondary {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-right: 5px;
      font-weight: 500;
    }
    .btn-use {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-discount {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .btn-view {
      background: var(--bakery-info);
      color: white;
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-use:hover, .btn-discount:hover, .btn-view:hover {
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
    .no-items {
      text-align: center;
      padding: 60px 20px;
      color: var(--bakery-success);
      font-size: 1.1rem;
    }
  `]
})
export class ExpiringItemsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  expiringItems: InventoryItem[] = [];
  daysAhead = 30;

  ngOnInit() {
    this.loadExpiringItems();
  }

  loadExpiringItems() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getExpiringSoonItems(this.daysAhead).subscribe({
      next: (items) => {
        this.expiringItems = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load expiring items. Please try again.';
        this.loading = false;
        console.error('Error loading expiring items:', err);
      }
    });
  }

  getCriticalCount(): number {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return this.expiringItems.filter(item =>
      item.expirationDate &&
      new Date(item.expirationDate) <= sevenDaysFromNow
    ).length;
  }

  getDaysUntilExpiry(item: InventoryItem): number {
    if (!item.expirationDate) return 999;
    const expiryDate = new Date(item.expirationDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getUrgencyClass(item: InventoryItem): string {
    const days = this.getDaysUntilExpiry(item);
    if (days <= 7) return 'critical';
    if (days <= 14) return 'warning';
    return 'normal';
  }

  useItem(itemId: string) {
    // Navigate to production or usage tracking
    console.log('Use item first:', itemId);
  }

  markForDiscount(itemId: string) {
    // Mark item for discount pricing
    console.log('Mark for discount:', itemId);
  }

  viewItem(itemId: string) {
    // Navigate to item details
    console.log('View item:', itemId);
  }
}