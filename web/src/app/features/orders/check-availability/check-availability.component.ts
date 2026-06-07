import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { OrdersService } from '../services/orders.service';

@Component({
  selector: 'app-check-availability',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="availability-container">
      <header class="page-header">
        <h1>Check Product Availability</h1>
        <p>Check if specific quantities are available</p>
      </header>
    
      <div class="form-section">
        <div class="form-group">
          <label>Product ID:</label>
          <input type="text" [(ngModel)]="productId" [attr.data-testid]="'product-id-input'">
        </div>
        <div class="form-group">
          <label>Quantity Needed:</label>
          <input type="number" [(ngModel)]="quantity" [attr.data-testid]="'quantity-input'">
        </div>
        <button (click)="checkAvailability()" [attr.data-testid]="'check-btn'">Check Availability</button>
      </div>
    
      @if (loading) {
        <div class="loading" [attr.data-testid]="'loading-spinner'">
          <p>Checking availability...</p>
        </div>
      }
    
      @if (result && !loading) {
        <div class="result">
          <div [class]="'status-' + (result.available ? 'available' : 'unavailable')" [attr.data-testid]="'availability-result'">
            <h3>{{ result.available ? '✅ Available' : '❌ Unavailable' }}</h3>
            <p>Quantity Available: <strong>{{ result.availableQuantity }}</strong></p>
            <p>Quantity Needed: <strong>{{ quantity }}</strong></p>
            @if (!result.available) {
              <div class="shortfall">
                <p>Shortfall: {{ quantity - result.availableQuantity }} units</p>
              </div>
            }
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
    .availability-container { padding: 20px; max-width: 600px; margin: 0 auto; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    .form-section { border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .form-group { margin: 15px 0; }
    label { display: block; font-weight: bold; margin-bottom: 5px; }
    input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    button { padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .status-available { background: #e8f5e9; border: 2px solid #4CAF50; padding: 15px; border-radius: 4px; color: #2e7d32; }
    .status-unavailable { background: #ffebee; border: 2px solid #f44336; padding: 15px; border-radius: 4px; color: #c62828; }
    .shortfall { margin-top: 10px; font-style: italic; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
  `]
})
export class CheckAvailabilityComponent implements OnInit {
  private ordersService = inject(OrdersService);

  productId = '';
  quantity = 0;
  result: any = null;
  loading = false;
  error: string | null = null;

  ngOnInit() {}

  checkAvailability() {
    if (!this.productId || this.quantity <= 0) {
      this.error = 'Please enter valid product ID and quantity';
      return;
    }

    this.loading = true;
    this.error = null;
    this.result = null;

    this.ordersService.checkAvailability(this.productId, this.quantity).subscribe({
      next: (response) => {
        // Map API response to component model
        // AvailabilityCheckResponse has Items[] array, extract first item
        const firstItem = response.items && response.items.length > 0 ? response.items[0] : null;
        this.result = {
          available: response.allItemsAvailable,
          availableQuantity: firstItem ? firstItem.availableQuantity : 0,
          message: response.message
        };
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to check availability: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
}
