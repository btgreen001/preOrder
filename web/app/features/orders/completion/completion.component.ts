import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrdersService, Order } from '../services/orders.service';

@Component({
  selector: 'app-completion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="completion-container">
      <header class="page-header">
        <h1>Complete Orders</h1>
        <p>Mark orders as completed</p>
      </header>
    
      <div class="orders-section">
        <button (click)="loadPendingOrders()" [attr.data-testid]="'refresh-btn'">Load Pending Orders</button>
    
        @if (loading) {
          <div class="loading" [attr.data-testid]="'loading-spinner'">
            <p>Loading pending orders...</p>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders; track order) {
                <tr [attr.data-testid]="'order-row-' + order.externalId">
                  <td>{{ order.externalId }}</td>
                  <td>{{ order.customerId }}</td>
                  <td>{{ order.orderDate | date:'short' }}</td>
                  <td>{{ '$' + order.totalAmount }}</td>
                  <td>
                    <button (click)="confirmCompletion(order)" [attr.data-testid]="'complete-btn-' + order.externalId" class="complete-btn">
                      Complete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
    
        @if (!loading && orders.length === 0) {
          <div class="no-items">
            <p>No pending orders</p>
          </div>
        }
      </div>
    
      @if (completionResult) {
        <div class="result">
          <div class="success" [attr.data-testid]="'completion-result'">
            <h3>✅ Order Completed</h3>
            <p>Order {{ completionResult.externalId }} has been marked as completed</p>
            <p>Completed at: {{ completionResult.completedAt | date:'short' }}</p>
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
    .completion-container { padding: 20px; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }
    .complete-btn { background: #2196F3; padding: 6px 12px; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .success { background: #e8f5e9; border: 2px solid #4CAF50; padding: 15px; border-radius: 4px; color: #2e7d32; margin: 20px 0; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .no-items { text-align: center; padding: 20px; color: #999; }
  `]
})
export class CompletionComponent implements OnInit {
  private ordersService = inject(OrdersService);

  orders: Order[] = [];
  completionResult: any = null;
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadPendingOrders();
  }


  loadPendingOrders() {
    this.loading = true;
    this.error = null;
    this.ordersService.getOrdersByStatus('Pending').subscribe({
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

  confirmCompletion(order: Order) {
    if (confirm(`Complete order ${order.externalId}?`)) {
      this.ordersService.completeOrder(order.externalId).subscribe({
        next: (result: any) => {
          this.completionResult = result;
          this.loadPendingOrders();
        },
        error: (err: any) => {
          this.error = 'Failed to complete order: ' + (err.message || 'Unknown error');
        }
      });
    }
  }
}
