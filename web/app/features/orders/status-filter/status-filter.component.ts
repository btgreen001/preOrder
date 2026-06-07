import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService, Order } from '../services/orders.service';

@Component({
  selector: 'app-status-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-filter-container">
      <header class="page-header">
        <h1>Orders by Status</h1>
        <p>Filter and view orders by their current status</p>
      </header>
    
      <div class="status-tabs">
        @for (status of statuses; track status) {
          <button
            (click)="selectStatus(status)"
            [class.active]="selectedStatus === status"
            [attr.data-testid]="'status-tab-' + status"
            class="status-tab"
            >
            {{ status }}
          </button>
        }
      </div>
    
      <div class="orders-section">
        <button (click)="loadOrdersByStatus()" [attr.data-testid]="'refresh-btn'" class="refresh-btn">Refresh</button>
    
        @if (loading) {
          <div class="loading" [attr.data-testid]="'loading-spinner'">
            <p>Loading {{ selectedStatus }} orders...</p>
          </div>
        }
    
        @if (!loading && orders.length > 0) {
          <div class="summary">
            <p>Found {{ orders.length }} {{ selectedStatus | lowercase }} order(s)</p>
          </div>
        }
    
        @if (orders.length > 0) {
          <table [attr.data-testid]="'orders-table'">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders; track order) {
                <tr [attr.data-testid]="'order-row-' + order.externalId">
                  <td>{{ order.externalId }}</td>
                  <td>{{ order.customerId }}</td>
                  <td>{{ order.orderDate | date:'short' }}</td>
                  <td>{{ '$' + order.totalAmount }}</td>
                  <td><span class="status-badge" [class]="(order.orderStatus || '').toLowerCase()">{{ order.orderStatus }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
    
        @if (!loading && orders.length === 0) {
          <div class="no-items">
            <p>No {{ selectedStatus | lowercase }} orders</p>
          </div>
        }
      </div>
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
        </div>
      }
    </div>
    `,
  styles: [`
    .status-filter-container { padding: 20px; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    .status-tabs { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
    .status-tab {
      padding: 10px 20px;
      background: #e0e0e0;
      color: #333;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }
    .status-tab.active {
      background: #2196F3;
      color: white;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }
    .refresh-btn { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .status-badge.pending { background: #fff9c4; color: #f57f17; }
    .status-badge.processing { background: #e1f5fe; color: #01579b; }
    .status-badge.completed { background: #e8f5e9; color: #1b5e20; }
    .status-badge.cancelled { background: #ffebee; color: #b71c1c; }
    .summary { padding: 15px; background: #f5f5f5; border-radius: 4px; margin: 15px 0; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .no-items { text-align: center; padding: 20px; color: #999; }
  `]
})
export class StatusFilterComponent implements OnInit {
  private ordersService = inject(OrdersService);

  statuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
  selectedStatus = 'Pending';
  orders: Order[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadOrdersByStatus();
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    this.loadOrdersByStatus();
  }

  loadOrdersByStatus() {
    this.loading = true;
    this.error = null;

    this.ordersService.getOrdersByStatus(this.selectedStatus).subscribe({
      next: (orders: Order[]) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load orders: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
}
