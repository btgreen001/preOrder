import { Component, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../inventory.service';

@Component({
  selector: 'app-supplier-add',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="supplier-add-container">
      <header class="page-header">
        <h1>Add New Supplier</h1>
        <button class="btn-secondary" (click)="goBack()">Back to Suppliers</button>
      </header>
    
      <div class="form-container">
        <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()">
          <div class="form-section">
            <h2>Basic Information</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="name">Supplier Name *</label>
                <input type="text" id="name" formControlName="name" placeholder="Enter supplier name">
                @if (supplierForm.get('name')?.invalid && supplierForm.get('name')?.touched) {
                  <div class="error">
                    Supplier name is required
                  </div>
                }
              </div>
              <div class="form-group">
                <label for="contactName">Contact Name *</label>
                <input type="text" id="contactName" formControlName="contactName" placeholder="Enter contact person name">
                @if (supplierForm.get('contactName')?.invalid && supplierForm.get('contactName')?.touched) {
                  <div class="error">
                    Contact name is required
                  </div>
                }
              </div>
            </div>
          </div>
    
          <div class="form-section">
            <h2>Contact Information</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" formControlName="email" placeholder="supplier@example.com">
                @if (supplierForm.get('email')?.invalid && supplierForm.get('email')?.touched) {
                  <div class="error">
                    Please enter a valid email address
                  </div>
                }
              </div>
              <div class="form-group">
                <label for="phone">Phone *</label>
                <input type="tel" id="phone" formControlName="phone" placeholder="(555) 123-4567">
                @if (supplierForm.get('phone')?.invalid && supplierForm.get('phone')?.touched) {
                  <div class="error">
                    Phone number is required
                  </div>
                }
              </div>
            </div>
            <div class="form-group full-width">
              <label for="address">Address *</label>
              <textarea id="address" formControlName="address" rows="3" placeholder="Enter full address"></textarea>
              @if (supplierForm.get('address')?.invalid && supplierForm.get('address')?.touched) {
                <div class="error">
                  Address is required
                </div>
              }
            </div>
          </div>
    
          <div class="form-section">
            <h2>Business Details</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="paymentTerms">Payment Terms *</label>
                <select id="paymentTerms" formControlName="paymentTerms">
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </div>
              <div class="form-group">
                <label for="leadTime">Lead Time (days) *</label>
                <input type="number" id="leadTime" formControlName="leadTime" min="1" placeholder="7">
                @if (supplierForm.get('leadTime')?.invalid && supplierForm.get('leadTime')?.touched) {
                  <div class="error">
                    Lead time must be at least 1 day
                  </div>
                }
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="active">
                Active Supplier
              </label>
            </div>
          </div>
    
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="supplierForm.invalid || saving">
              {{ saving ? 'Saving...' : 'Save Supplier' }}
            </button>
            <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    `,
  styles: [`
    .supplier-add-container {
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
    .form-container {
      background: var(--bakery-surface);
      border-radius: 8px;
      padding: 30px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .form-section {
      margin-bottom: 30px;
    }
    .form-section h2 {
      color: var(--bakery-text-emph);
      margin: 0 0 20px 0;
      font-size: 1.25rem;
      font-weight: 600;
      border-bottom: 2px solid var(--bakery-accent);
      padding-bottom: 10px;
    }
    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    .form-group {
      flex: 1;
    }
    .form-group.full-width {
      width: 100%;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      font-size: 1rem;
    }
    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: normal !important;
    }
    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }
    .error {
      color: var(--bakery-error);
      font-size: 0.875rem;
      margin-top: 5px;
    }
    .form-actions {
      display: flex;
      gap: 15px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid var(--bakery-accent);
    }
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    .btn-primary {
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
    }
    .btn-primary:disabled {
      opacity: 0.5;
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
        flex-direction: column;
        gap: 0;
      }
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SupplierAddComponent {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  saving = false;

  supplierForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
    address: ['', [Validators.required, Validators.minLength(10)]],
    paymentTerms: ['Net 30', Validators.required],
    leadTime: [7, [Validators.required, Validators.min(1)]],
    active: [true]
  });

  saveSupplier() {
    if (this.supplierForm.valid) {
      this.saving = true;

      const formValue = this.supplierForm.value;
      const supplierData = {
        name: formValue.name!,
        contactName: formValue.contactName!,
        email: formValue.email!,
        phone: formValue.phone!,
        address: formValue.address!,
        paymentTerms: formValue.paymentTerms!,
        leadTime: formValue.leadTime!,
        active: formValue.active ?? true
      };

      this.inventoryService.createSupplier(supplierData).subscribe({
        next: () => {
          this.router.navigate(['/inventory/suppliers']);
        },
        error: (err) => {
          alert('Failed to create supplier. Please try again.');
          console.error('Error creating supplier:', err);
          this.saving = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.supplierForm.controls).forEach(key => {
        this.supplierForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack() {
    this.router.navigate(['/inventory/suppliers']);
  }
}
