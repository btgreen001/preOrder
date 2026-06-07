import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { OrdersService } from '../services/orders.service';

@Component({
  selector: 'app-pick-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pick-list-container">
      <header class="page-header">
        <h1>Order Pick Lists</h1>
        <p>Generate and manage pick lists for order fulfillment</p>
      </header>
    
      <div class="order-selector">
        <label>Select Order:</label>
        <input type="text" placeholder="Enter Order ID" [(ngModel)]="orderId" [attr.data-testid]="'order-id-input'">
        <button (click)="generatePickList()" [attr.data-testid]="'generate-btn'">Generate Pick List</button>
      </div>
    
      @if (loading) {
        <div class="loading" [attr.data-testid]="'loading-spinner'">
          <p>Generating pick list...</p>
        </div>
      }
    
      @if (pickList && !loading) {
        <div class="pick-list-result">
          <div class="header" [attr.data-testid]="'pick-list-result'">
            <h2>Pick List for Order {{ pickList.orderId }} for {{ pickList.customerName }}</h2>
            <p>Priority: <strong>{{ pickList.priority }}</strong></p>
            <p>Total Items: <strong>{{ pickList.totalQuantity }}</strong></p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Location</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pickList.items; track item) {
                <tr [attr.data-testid]="'pick-item-' + item.id">
                  <td>{{ item.productName }}</td>
                  <td>{{ item.sku }}</td>
                  <td>{{ item.quantity }} {{ item.unitOfMeasure }}</td>
                  <td>{{ item.location || 'N/A' }}</td>
                  <td>{{ item.notes || '-' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <div class="actions">
            <button (click)="printPickList()" [attr.data-testid]="'print-btn'" class="print-btn">Print Pick List</button>
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
    .pick-list-container { padding: 20px; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    .order-selector { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
    input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px; }
    button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .print-btn { background: #2196F3; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
  `]
})
export class PickListComponent implements OnInit {
  private ordersService = inject(OrdersService);

  orderId = '0ceb6cad-ccca-4335-a348-3bcd6559e1ee';
  pickList: any = null;
  loading = false;
  error: string | null = null;

  ngOnInit() {}

  generatePickList() {
    if (!this.orderId) {
      this.error = 'Please enter an order ID';
      return;
    }

    this.loading = true;
    this.error = null;
    this.pickList = null;

    this.ordersService.generatePickList(this.orderId).subscribe({
      next: (result: any) => {
        this.pickList = result;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to generate pick list: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  printPickList() {
    window.print();
  }
}
