import { Component, inject } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';

@Component({
  selector: 'app-batch-add',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <div class="batch-add-container">
      <header class="page-header">
        <h1>Add New Batch</h1>
        <div class="actions">
          <button class="btn-secondary" (click)="cancel()">Cancel</button>
          <button class="btn-primary" (click)="saveBatch()" [disabled]="!batchForm.valid || saving">
            {{ saving ? 'Saving...' : 'Save Batch' }}
          </button>
        </div>
      </header>

      <form [formGroup]="batchForm" class="batch-form">
        <div class="form-section">
          <h2>Batch Information</h2>
          <div class="form-row">
            <div class="form-group">
              <label for="batchNumber">Batch Number *</label>
              <input type="text" id="batchNumber" formControlName="batchNumber" placeholder="e.g., BATCH-2025-001">
            </div>
            <div class="form-group">
              <label for="itemName">Item Name *</label>
              <input type="text" id="itemName" formControlName="itemName" placeholder="e.g., All-Purpose Flour">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="quantity">Quantity *</label>
              <input type="number" id="quantity" formControlName="quantity" min="0.01" step="0.01">
            </div>
            <div class="form-group">
              <label for="unit">Unit *</label>
              <select id="unit" formControlName="unit">
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="cups">Cups</option>
                <option value="pieces">Pieces</option>
                <option value="gallons">Gallons</option>
                <option value="liters">Liters</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="costPerUnit">Cost per Unit ($)</label>
              <input type="number" id="costPerUnit" formControlName="costPerUnit" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label for="supplier">Supplier</label>
              <input type="text" id="supplier" formControlName="supplier" placeholder="Supplier name">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="receivedDate">Received Date *</label>
              <input type="date" id="receivedDate" formControlName="receivedDate">
            </div>
            <div class="form-group">
              <label for="expirationDate">Expiration Date</label>
              <input type="date" id="expirationDate" formControlName="expirationDate">
            </div>
          </div>

          <div class="form-group">
            <label for="status">Status *</label>
            <select id="status" formControlName="status">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .batch-add-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
      max-width: 800px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--bakery-accent);
    }

    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .actions { display: flex; gap: 10px; }

    .batch-form {
      background: var(--bakery-surface);
      padding: 30px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }

    .form-section h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--bakery-text-emph);
    }

    input, select {
      padding: 10px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      font-size: 14px;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--bakery-accent-2);
      box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
    }

    .btn-primary, .btn-secondary {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
    }

    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
    }

    .btn-primary:disabled {
      background: var(--bakery-text-muted);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }

    .btn-primary:hover:not(:disabled), .btn-secondary:hover {
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .actions {
        flex-direction: column;
        width: 100%;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class BatchAddComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  saving = false;
  batchForm: FormGroup;

  constructor() {
    this.batchForm = this.fb.group({
      batchNumber: ['', [Validators.required, Validators.minLength(3)]],
      itemName: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      unit: ['lbs', Validators.required],
      costPerUnit: [0, Validators.min(0)],
      supplier: [''],
      receivedDate: [new Date().toISOString().split('T')[0], Validators.required],
      expirationDate: [''],
      status: ['active', Validators.required]
    });
  }

  saveBatch() {
    if (this.batchForm.valid) {
      this.saving = true;

      const batchData = {
        itemId: 'item-001', // TODO: Make this selectable from inventory items
        itemName: this.batchForm.value.itemName,
        batchNumber: this.batchForm.value.batchNumber,
        quantity: this.batchForm.value.quantity,
        unit: this.batchForm.value.unit,
        costPerUnit: this.batchForm.value.costPerUnit,
        supplier: this.batchForm.value.supplier,
        receivedDate: this.batchForm.value.receivedDate,
        expirationDate: this.batchForm.value.expirationDate,
        location: 'Dry Storage A1', // TODO: Make this selectable
        status: this.batchForm.value.status
      };

      this.inventoryService.createBatch(batchData).subscribe({
        next: () => {
          this.router.navigate(['/inventory/batches']);
        },
        error: (err) => {
          alert('Failed to create batch. Please try again.');
          console.error('Error creating batch:', err);
          this.saving = false;
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/inventory/batches']);
  }
}