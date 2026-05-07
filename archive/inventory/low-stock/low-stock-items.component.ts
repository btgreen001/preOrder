import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService, InventoryItem } from '../inventory.service';

@Component({
  selector: 'app-low-stock-items',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="low-stock-container">
      <header class="page-header">
        <h1>Low Stock Items</h1>
        <p>Items requiring immediate attention and reorder</p>
      </header>

      <div class="loading" *ngIf="loading">
        <p>Loading low stock items...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadLowStockItems()">Retry</button>
      </div>

      <div class="items-summary" *ngIf="!loading && !error">
        <div class="summary-card">
          <h3>Items Below Reorder Point</h3>
          <span class="count">{{ lowStockItems.length }}</span>
        </div>
        <div class="summary-card critical">
          <h3>Out of Stock</h3>
          <span class="count">{{ getOutOfStockCount() }}</span>
        </div>
      </div>

      <div class="items-list" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Reorder Point</th>
              <th>Unit</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of lowStockItems" [class.critical]="item.quantityOnHand === 0">
              <td>{{ item.name }}</td>
              <td>{{ item.categoryId || 0 }}</td>
              <td class="stock-level" [class.critical]="item.quantityOnHand === 0">
                {{ item.quantityOnHand }}
              </td>
              <td>{{ item.reorderPoint }}</td>
              <td>{{ item.unitOfMeasure }}</td>
              <td>{{ item.supplierName || 'Unknown' }}</td>
              <td>
                <span class="status-badge" [class]="getStatusClass(item)">
                  {{ getStatusText(item) }}
                </span>
              </td>
              <td>
                <button class="btn-order" (click)="placeOrder(item.externalId)">Order</button>
                <button class="btn-view" (click)="viewItem(item.externalId)">View</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="no-items" *ngIf="lowStockItems.length === 0">
          <p>✅ All items are above reorder points. Great job maintaining inventory levels!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .low-stock-container {
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
    .stock-level.critical {
      color: var(--bakery-error);
      font-weight: 700;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.low-stock {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .status-badge.out-of-stock {
      background: var(--bakery-error);
      color: white;
    }
    .btn-order, .btn-view, .btn-secondary {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-right: 5px;
      font-weight: 500;
    }
    .btn-order {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-view {
      background: var(--bakery-info);
      color: white;
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-order:hover, .btn-view:hover {
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
export class LowStockItemsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  lowStockItems: InventoryItem[] = [];

  ngOnInit() {
    this.loadLowStockItems();
  }

  loadLowStockItems() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getLowStockItems().subscribe({
      next: (items) => {
        this.lowStockItems = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load low stock items. Please try again.';
        this.loading = false;
        console.error('Error loading low stock items:', err);
      }
    });
  }

  getOutOfStockCount(): number {
    return this.lowStockItems.filter(item => item.quantityOnHand === 0).length;
  }

  getStatusClass(item: InventoryItem): string {
    return item.quantityOnHand === 0 ? 'out-of-stock' : 'low-stock';
  }

  getStatusText(item: InventoryItem): string {
    return item.quantityOnHand === 0 ? 'Out of Stock' : 'Low Stock';
  }

  placeOrder(itemId: string) {
    // Navigate to order creation or supplier ordering
    console.log('Place order for item:', itemId);
  }

  viewItem(itemId: string) {
    // Navigate to item details
    console.log('View item:', itemId);
  }
}