import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { OrdersService, AvailabilityCheckResponse } from '../services/orders.service';


interface OrderItem {
  sellableProductExternalId: string;
  quantity: number;
}

@Component({
  selector: 'app-validate-inventory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="validate-container">
      <header class="page-header">
        <h1>Validate Order Inventory</h1>
        <p>Check if inventory is available for order items before placement</p>
      </header>
    
      <!-- Manual Entry Mode (always show when not in modal) -->
      @if (!isModalMode) {
        <div class="form-section">
          <h2>Add Order Items</h2>
          <div class="item-form">
            <input type="text" placeholder="Product ID (UUID)" [(ngModel)]="newProductId" [attr.data-testid]="'product-id-input'">
            <input type="number" placeholder="Quantity" [(ngModel)]="newQuantity" [attr.data-testid]="'quantity-input'">
            <button (click)="addItem()" [attr.data-testid]="'add-item-btn'">Add Item</button>
          </div>
        </div>
      }
    
      <!-- Items Display (manual or from input) -->
      @if (items.length > 0) {
        <div class="items-section">
          <h2>Order Items ({{ items.length }})</h2>
          <table [attr.data-testid]="'items-table'">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Quantity</th>
                @if (!isModalMode) {
                  <th>Action</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of items; track item; let idx = $index) {
                <tr>
                  <td>{{ item.sellableProductExternalId }}</td>
                  <td>{{ item.quantity }}</td>
                  @if (!isModalMode) {
                    <td><button (click)="removeItem(idx)" [attr.data-testid]="'remove-item-' + idx">Remove</button></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    
      <!-- Validation Controls -->
      <div class="validation-section">
        <button (click)="validateInventory()" [attr.data-testid]="'validate-btn'" [disabled]="items.length === 0">
          Validate Inventory
        </button>
        @if (isModalMode && validationResult) {
          <button (click)="onProceed()" [attr.data-testid]="'proceed-btn'" [disabled]="!validationResult.allItemsAvailable">
            Proceed with Order
          </button>
        }
        @if (isModalMode) {
          <button (click)="onCancel()" [attr.data-testid]="'cancel-btn'" class="secondary-btn">
            Go Back
          </button>
        }
      </div>
    
      <!-- Loading State -->
      @if (isLoading) {
        <div class="loading" [attr.data-testid]="'loading-spinner'">
          <p>Validating inventory...</p>
        </div>
      }
    
      <!-- Validation Result -->
      @if (validationResult && !isLoading) {
        <div class="result">
          <div [class]="'result-' + (validationResult.allItemsAvailable ? 'valid' : 'invalid')" [attr.data-testid]="'validation-result'">
            <h3>{{ validationResult.allItemsAvailable ? '✅ Valid' : '❌ Invalid' }}</h3>
            <p>{{ validationResult.message }}</p>
            @if (validationResult.items && validationResult.items.length > 0) {
              <div>
                <p><strong>Item Details:</strong></p>
                <ul>
                  @for (item of validationResult.items; track item) {
                    <li>
                      {{ item.productName }}: Requested {{ item.requestedQuantity }}, Available {{ item.availableQuantity }}
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      }
    
      <!-- Error State -->
      @if (errorMessage) {
        <div class="error">
          <p>{{ errorMessage }}</p>
        </div>
      }
    </div>
    `,
  styles: [`
    .validate-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .page-header h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
    }
    .form-section, .items-section, .validation-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .item-form {
      display: grid;
      grid-template-columns: 1fr 1fr 120px;
      gap: 10px;
      margin: 10px 0;
    }
    input {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    button.secondary-btn {
      background: #757575;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .result-valid {
      background: #e8f5e9;
      border: 2px solid #4CAF50;
      padding: 15px;
      border-radius: 4px;
      color: #2e7d32;
    }
    .result-invalid {
      background: #ffebee;
      border: 2px solid #f44336;
      padding: 15px;
      border-radius: 4px;
      color: #c62828;
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #0066cc;
    }
    .error {
      background: #ffebee;
      color: #c62828;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
    }
  `]
})
export class ValidateInventoryComponent implements OnInit {
  @Input() orderedItems: OrderItem[] = [];
  @Output() validationComplete = new EventEmitter<AvailabilityCheckResponse>();
  @Output() cancelled = new EventEmitter<void>();

  items: OrderItem[] = [];
  newProductId = '';
  newQuantity: number | null = null;
  validationResult: AvailabilityCheckResponse | null = null;
  isLoading = false;
  errorMessage = '';

  // Modal-aware flag: true when items provided via @Input (modal mode)
  isModalMode = false;

  ordersService = inject(OrdersService);

  ngOnInit(): void {
    // If items provided via @Input, we're in modal mode
    if (this.orderedItems && this.orderedItems.length > 0) {
      this.isModalMode = true;
      this.items = [...this.orderedItems];
      // Auto-validate in modal mode
      this.validateInventory();
    } else {
      this.newProductId = 'de5595f6-4d3e-44b7-9524-7cb41a6086bc';
      this.newQuantity = 1;
      this.addItem();
      this.validateInventory();
    }
  }

  addItem(): void {
    if (!this.newProductId || !this.newQuantity || this.newQuantity <= 0) {
      this.errorMessage = 'Please enter a valid product ID (UUID format) and quantity';
      return;
    }

    // Trim whitespace from UUID
    const productId = this.newProductId.trim();

    // Validate UUID format (basic check for UUID pattern)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      this.errorMessage = 'Product ID must be a valid UUID format (e.g., de5595f6-4d3e-44b7-9524-7cb41a6086bc)';
      return;
    }

    this.items.push({
      sellableProductExternalId: productId,
      quantity: this.newQuantity
    });

    // Keep form values for testing - comment out to clear after adding
    this.newProductId = '';
    this.newQuantity = null;
    this.errorMessage = '';
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    if (this.items.length === 0) {
      this.validationResult = null;
      this.errorMessage = '';
    }
  }

  validateInventory(): void {
    if (this.items.length === 0) {
      this.errorMessage = 'Please add at least one item to validate';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Group items by product ID and sum quantities (handle duplicates)
    const itemMap = new Map<string, number>();
    for (const item of this.items) {
      const productId = item.sellableProductExternalId;
      const currentQty = itemMap.get(productId) || 0;
      itemMap.set(productId, currentQty + item.quantity);
    }

    // Convert to request format with aggregated quantities
    const requestItems = Array.from(itemMap, ([productId, quantity]) => ({
      sellableProductExternalId: productId,
      quantity: quantity
    }));

    this.ordersService.validateOrderInventory(requestItems).subscribe({
      next: (result: AvailabilityCheckResponse) => {
        this.validationResult = result;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Validation error response:', err);
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 400) {
          this.errorMessage = 'Invalid request format. Ensure Product ID is a valid UUID.';
        } else {
          this.errorMessage = 'Error validating inventory. Please try again.';
        }
        console.error('Validation error:', err);
      }
    });
  }

  onProceed(): void {
    if (this.validationResult && this.validationResult.allItemsAvailable) {
      this.validationComplete.emit(this.validationResult);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}