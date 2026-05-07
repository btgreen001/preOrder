import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { CategoryAddComponent } from '../categories/category-add/category-add';

@Component({
  selector: 'app-item-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="item-add-container">
      <h2>Add Inventory Item</h2>
      <p>Create a new item and receive initial stock.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="item-form">
        <div class="row">
          <label>
            Name *
            <input type="text" formControlName="name" />
          </label>
          <label>
            SKU
            <input type="text" formControlName="sku" />
          </label>
        </div>

        <label>
          Description
          <textarea formControlName="description" rows="3"></textarea>
        </label>

        <div class="row three">
          <label>
            Quantity *
            <input type="number" step="0.01" min="0.01" formControlName="quantity" />
          </label>
          <label>
            Unit Of Measure *
            <input type="text" formControlName="unitOfMeasure" />
          </label>
          <label>
            Unit Cost *
            <input type="number" step="0.01" min="0" formControlName="unitCost" />
          </label>
        </div>

        <div class="row three">
          <label>
            Warehouse Location
            <input type="text" formControlName="warehouseLocation" />
          </label>
          <label>
            Batch Number
            <input type="text" formControlName="batchNumber" />
          </label>
          <label>
            Expiration Date
            <input type="date" formControlName="expirationDate" />
          </label>
        </div>

        <div class="row two">
          <label>
            Category (optional)
            <input type="text" formControlName="category" />
          </label>
          <label>
            Reorder Point (optional)
            <input type="number" step="0.01" min="0" formControlName="reorderPoint" />
          </label>
        </div>

        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="success">{{ success }}</p>

        <div class="actions">
          <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="submitting || form.invalid">
            {{ submitting ? 'Saving...' : 'Create Item' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .item-add-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    h2 {
      color: var(--bakery-text-emph);
      font-size: 2rem;
      margin: 0 0 0.5rem;
    }
    p {
      color: var(--bakery-text-muted);
      margin: 0;
    }
    .item-form {
      margin-top: 20px;
      display: grid;
      gap: 14px;
      max-width: 960px;
    }
    .row {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 1fr;
    }
    .row.three {
      grid-template-columns: repeat(3, 1fr);
    }
    .row.two {
      grid-template-columns: repeat(2, 1fr);
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 0.95rem;
      color: var(--bakery-text-emph);
    }
    input, textarea {
      padding: 10px;
      border: 1px solid var(--bakery-accent);
      border-radius: 6px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .btn-primary, .btn-secondary {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-secondary {
      background: var(--bakery-text-muted);
      color: white;
    }
    .error {
      color: var(--bakery-error);
    }
    .success {
      color: var(--bakery-success);
    }
    @media (max-width: 840px) {
      .row, .row.two, .row.three {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ItemAddComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  submitting = false;
  error = '';
  success = '';

  form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    sku: [''],
    categoryId: [0],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    unitOfMeasure: ['units', [Validators.required]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    warehouseLocation: [''],
    batchNumber: [''],
    expirationDate: [''],
    category: [''],
    reorderPoint: [0, [Validators.min(0)]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting = true;
    this.error = '';
    this.success = '';

    this.inventoryService.createItem({
      name: raw.name ?? '',
      description: raw.description || undefined,
      sku: raw.sku || undefined,
      categoryId: Number(raw.categoryId ?? 0),
      quantity: Number(raw.quantity ?? 0),
      unitOfMeasure: raw.unitOfMeasure ?? 'units',
      unitCost: Number(raw.unitCost ?? 0),
      reorderPoint: Number(raw.reorderPoint ?? 0),
      warehouseLocation: raw.warehouseLocation || undefined,
      batchNumber: raw.batchNumber || undefined,
      expirationDate: raw.expirationDate || undefined
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.success = 'Item created successfully.';
        this.router.navigate(['/inventory/items']);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.error || 'Failed to create item.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/inventory/items']);
  }
}