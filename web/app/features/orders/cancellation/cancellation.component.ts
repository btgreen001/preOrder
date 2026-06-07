import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersService, Order } from '../services/orders.service';

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cancellation-container">
      <header class="page-header">
        <h1>Cancel Orders</h1>
        <p>Cancel orders and release reservations</p>
      </header>
    
      <div class="orders-section">
        <button (click)="loadActiveOrders()" [attr.data-testid]="'refresh-btn'">Load Active Orders</button>
    
        @if (loading) {
          <div class="loading" [attr.data-testid]="'loading-spinner'">
            <p>Loading active orders...</p>
          </div>
        }
    
        @if (orders.length > 0) {
          <table [attr.data-testid]="'orders-table'">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders; track order) {
                <tr [attr.data-testid]="'order-row-' + order.externalId">
                  <td>{{ order.externalId }}</td>
                  <td>{{ order.customerId }}</td>
                  <td>{{ order.orderStatus }}</td>
                  <td>{{ order.orderDate | date:'short' }}</td>
                  <td>
                    <button (click)="showCancellationForm(order)" [attr.data-testid]="'cancel-btn-' + order.externalId" class="cancel-btn">
                      Cancel
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
    
        @if (!loading && orders.length === 0) {
          <div class="no-items">
            <p>No active orders</p>
          </div>
        }
      </div>
    
      @if (selectedOrder) {
        <div class="cancellation-form">
          <h2>Confirm Cancellation</h2>
          <p>Order: {{ selectedOrder.externalId }}</p>
          <p>Customer: {{ selectedOrder.customerId }}</p>
          <div class="form-group">
            <label>Reason for cancellation:</label>
            <textarea [(ngModel)]="cancellationReason" [attr.data-testid]="'reason-textarea'" placeholder="Enter reason"></textarea>
          </div>
          <div class="actions">
            <button (click)="processCancellation()" [attr.data-testid]="'confirm-cancel-btn'" class="confirm-btn">Confirm Cancellation</button>
            <button (click)="selectedOrder = null" class="cancel-btn-secondary">Cancel</button>
          </div>
        </div>
      }
    
      @if (cancellationResult) {
        <div class="result">
          <div class="success" [attr.data-testid]="'cancellation-result'">
            <h3>✅ Order Cancelled</h3>
            <p>Order {{ cancellationResult.externalId }} has been cancelled</p>
            <p>Reservations have been released</p>
          </div>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
        </div>
      }
    </div>
    `,
  styles: [`
    .cancellation-container { padding: 20px; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 5px 10px 0; }
    .cancel-btn { background: #f44336; }
    .cancel-btn-secondary { background: #999; }
    .confirm-btn { background: #ff9800; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .cancellation-form { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .form-group { margin: 15px 0; }
    label { display: block; font-weight: bold; margin-bottom: 5px; }
    textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial; height: 80px; }
    .success { background: #fff3e0; border: 2px solid #ff9800; padding: 15px; border-radius: 4px; color: #e65100; margin: 20px 0; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .no-items { text-align: center; padding: 20px; color: #999; }
    .actions { margin-top: 15px; }
  `]
})
export class CancellationComponent implements OnInit {
  private ordersService = inject(OrdersService);

  orders: Order[] = [];
  selectedOrder: Order | null = null;
  cancellationReason = '';
  cancellationResult: any = null;
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadActiveOrders();
  }

  loadActiveOrders(): void {
    this.loading = true;
    this.ordersService.getOrders().subscribe({
      next: (orders: Order[]) => {
        this.orders = orders.filter(o => (o.orderStatus || '').toLowerCase() !== 'cancelled');
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading orders:', err);
        this.loading = false;
      }
    });
  }

  showCancellationForm(order: Order) {
    this.selectedOrder = order;
    this.cancellationReason = '';
  }

  processCancellation() {
    if (!this.selectedOrder) return;

    this.ordersService.cancelOrder(this.selectedOrder.externalId).subscribe({
      next: (result: any) => {
        this.cancellationResult = result;
        this.selectedOrder = null;
        this.loadActiveOrders();
      },
      error: (err: any) => {
        this.error = 'Failed to cancel order: ' + (err.message || 'Unknown error');
      }
    });
  }
}
