import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, Supplier } from '../../inventory.service';

@Component({
  selector: 'app-supplier-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="supplier-edit-container">
      <header class="page-header">
        <h1>Edit Supplier</h1>
        <button class="btn-secondary" (click)="goBack()">Back to Suppliers</button>
      </header>

      <div class="loading" *ngIf="loading">
        <p>Loading supplier...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="goBack()">Back to Suppliers</button>
      </div>

      <div class="form-container" *ngIf="!loading && !error">
        <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()">
          <div class="form-section">
            <h2>Basic Information</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="name">Supplier Name *</label>
                <input type="text" id="name" formControlName="name" placeholder="Enter supplier name">
                <div class="error" *ngIf="supplierForm.get('name')?.invalid && supplierForm.get('name')?.touched">
                  Supplier name is required
                </div>
              </div>
              <div class="form-group">
                <label for="contactName">Contact Name *</label>
                <input type="text" id="contactName" formControlName="contactName" placeholder="Enter contact person name">
                <div class="error" *ngIf="supplierForm.get('contactName')?.invalid && supplierForm.get('contactName')?.touched">
                  Contact name is required
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Contact Information</h2>
            <div class="form-row">
              <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" formControlName="email" placeholder="supplier@example.com">
                <div class="error" *ngIf="supplierForm.get('email')?.invalid && supplierForm.get('email')?.touched">
                  Please enter a valid email address
                </div>
              </div>
              <div class="form-group">
                <label for="phone">Phone *</label>
                <input type="tel" id="phone" formControlName="phone" placeholder="(555) 123-4567">
                <div class="error" *ngIf="supplierForm.get('phone')?.invalid && supplierForm.get('phone')?.touched">
                  Phone number is required
                </div>
              </div>
            </div>
            <div class="form-group full-width">
              <label for="address">Address *</label>
              <textarea id="address" formControlName="address" rows="3" placeholder="Enter full address"></textarea>
              <div class="error" *ngIf="supplierForm.get('address')?.invalid && supplierForm.get('address')?.touched">
                Address is required
              </div>
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
                <div class="error" *ngIf="supplierForm.get('leadTime')?.invalid && supplierForm.get('leadTime')?.touched">
                  Lead time must be at least 1 day
                </div>
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
              {{ saving ? 'Saving...' : 'Update Supplier' }}
            </button>
            <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .supplier-edit-container {
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
    input, select, textarea {
      font-family: inherit;
    }
    .loading, .error {
      text-align: center;
      padding: 40px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .error p {
      color: var(--bakery-error);
      margin-bottom: 15px;
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
export class SupplierEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = false;
  loading = false;
  error = '';
  supplierId = '';

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

  ngOnInit() {
    this.supplierId = this.route.snapshot.params['id'];
    if (this.supplierId) {
      this.loadSupplier();
    } else {
      this.error = 'Supplier ID not found';
    }
  }

  loadSupplier() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getSupplier(this.supplierId).subscribe({
      next: (supplier) => {
        this.supplierForm.patchValue({
          name: supplier.name,
          contactName: supplier.contactName,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          paymentTerms: supplier.paymentTerms,
          leadTime: supplier.leadTime,
          active: supplier.active
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load supplier. Please try again.';
        this.loading = false;
        console.error('Error loading supplier:', err);
      }
    });
  }

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

      this.inventoryService.updateSupplier(this.supplierId, supplierData).subscribe({
        next: () => {
          this.router.navigate(['/inventory/suppliers']);
        },
        error: (err) => {
          alert('Failed to update supplier. Please try again.');
          console.error('Error updating supplier:', err);
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
