import { Component, OnInit, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../inventory.service';

@Component({
  selector: 'app-item-edit',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="item-edit-container">
      <h2>Edit Item</h2>
      <p>Update inventory details and save changes.</p>
    
      @if (loadError) {
        <div class="error">{{ loadError }}</div>
      }
    
      @if (!loadError) {
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
              Quantity On Hand *
              <input type="number" step="0.01" min="0" formControlName="quantityOnHand" />
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
              Reorder Point
              <input type="number" step="0.01" min="0" formControlName="reorderPoint" />
            </label>
          </div>
          @if (error) {
            <p class="error">{{ error }}</p>
          }
          @if (success) {
            <p class="success">{{ success }}</p>
          }
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      }
    </div>
    `,
  styles: [`
    .item-edit-container {
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
      margin-top: 8px;
    }
    .success {
      color: var(--bakery-success);
      margin-top: 8px;
    }
    @media (max-width: 840px) {
      .row, .row.two, .row.three {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ItemEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);

  itemId = '';
  loadError = '';
  error = '';
  success = '';
  saving = false;

  form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    sku: [''],
    quantityOnHand: [0, [Validators.required, Validators.min(0)]],
    unitOfMeasure: ['units', [Validators.required]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    warehouseLocation: [''],
    batchNumber: [''],
    expirationDate: [''],
    categoryId: [0],
    reorderPoint: [0, [Validators.min(0)]]
  });

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.itemId) {
      this.loadError = 'Missing inventory item id.';
      return;
    }

    this.inventoryService.getItem(this.itemId).subscribe({
      next: (item) => {
        this.form.patchValue({
          name: item.name,
          description: item.description || '',
          sku: item.sku || '',
          quantityOnHand: item.quantityOnHand,
          unitOfMeasure: item.unitOfMeasure,
          unitCost: item.unitCost,
          warehouseLocation: item.location || '',
          batchNumber: item.batchNumber || '',
          expirationDate: item.expirationDate ? String(item.expirationDate).substring(0, 10) : '',
          categoryId: item.categoryId || 0,
          reorderPoint: item.reorderPoint
        });
      },
      error: (err) => {
        this.loadError = err?.status === 404 ? 'Item not found.' : 'Failed to load item.';
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.itemId) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving = true;
    this.error = '';
    this.success = '';

    this.inventoryService.updateItem(this.itemId, {
      name: raw.name ?? '',
      description: raw.description || undefined,
      sku: raw.sku || undefined,
      categoryId: Number(raw.categoryId ?? 0),
      quantityOnHand: Number(raw.quantityOnHand ?? 0),
      unitOfMeasure: raw.unitOfMeasure ?? 'units',
      unitCost: Number(raw.unitCost ?? 0),
      reorderPoint: Number(raw.reorderPoint ?? 0),
      warehouseLocation: raw.warehouseLocation || undefined,
      batchNumber: raw.batchNumber || undefined,
      expirationDate: raw.expirationDate || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Item updated successfully.';
        this.router.navigate(['/inventory/items']);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.error || 'Failed to update item.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/inventory/items']);
  }
}