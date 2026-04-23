import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService, Supplier } from '../../inventory.service';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="supplier-detail-container">
      <header class="page-header">
        <h1>Supplier Details</h1>
        <div class="header-actions">
          <button class="btn-secondary" (click)="editSupplier()">Edit Supplier</button>
          <button class="btn-secondary" (click)="goBack()">Back to Suppliers</button>
        </div>
      </header>

      <div class="detail-container" *ngIf="!loading && supplier">
        <div class="detail-card">
          <div class="detail-section">
            <h2>{{ supplier.name }}</h2>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Contact Name</label>
                <p>{{ supplier.contactName }}</p>
              </div>
              <div class="detail-item">
                <label>Email</label>
                <p><a [href]="'mailto:' + supplier.email">{{ supplier.email }}</a></p>
              </div>
              <div class="detail-item">
                <label>Phone</label>
                <p><a [href]="'tel:' + supplier.phone">{{ supplier.phone }}</a></p>
              </div>
              <div class="detail-item">
                <label>Address</label>
                <p>{{ supplier.address }}</p>
              </div>
              <div class="detail-item">
                <label>Payment Terms</label>
                <p>{{ supplier.paymentTerms }}</p>
              </div>
              <div class="detail-item">
                <label>Lead Time</label>
                <p>{{ supplier.leadTime }} days</p>
              </div>
              <div class="detail-item">
                <label>Status</label>
                <p>
                  <span class="status-badge" [class.active]="supplier.active" [class.inactive]="!supplier.active">
                    {{ supplier.active ? 'Active' : 'Inactive' }}
                  </span>
                </p>
              </div>
              <div class="detail-item">
                <label>Created</label>
                <p>{{ supplier.createdDate | date:'medium' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading supplier details...</p>
      </div>
      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="reload()">Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .supplier-detail-container { padding: 20px; background: var(--bakery-bg); color: var(--bakery-text-emph); min-height: 100vh; max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--bakery-accent); }
    .page-header h1 { color: var(--bakery-text-emph); margin: 0; font-size: 2rem; font-weight: 600; }
    .header-actions { display: flex; gap: 10px; }
    .btn-secondary { padding: 10px 16px; border: 1px solid var(--bakery-accent); border-radius: 4px; background: var(--bakery-surface); color: var(--bakery-text-emph); cursor: pointer; font-weight: 500; font-size: 0.9rem; }
    .btn-secondary:hover { background: var(--bakery-accent); }
    .detail-container { background: var(--bakery-surface); border-radius: 8px; padding: 30px; box-shadow: var(--bakery-shadow-soft); }
    .detail-card { margin-bottom: 20px; }
    .detail-section h2 { color: var(--bakery-text-emph); margin: 0 0 20px; font-size: 1.5rem; font-weight: 600; border-bottom: 2px solid var(--bakery-accent); padding-bottom: 10px; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .detail-item { background: var(--bakery-bg); padding: 20px; border-radius: 6px; border: 1px solid var(--bakery-accent); }
    .detail-item label { display: block; font-weight: 600; color: var(--bakery-text-emph); margin-bottom: 8px; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .status-badge.active { background: var(--bakery-success); color: #fff; }
    .status-badge.inactive { background: var(--bakery-text-muted); color: #fff; }
    .loading, .error { text-align: center; padding: 40px; color: var(--bakery-text-muted); }
  `]
})
export class SupplierDetailComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = true;
  error = '';
  supplierId = '';
  supplier: Supplier | null = null;

  ngOnInit() {
    this.supplierId = this.route.snapshot.params['id'];
    this.loadSupplier();
  }

  loadSupplier() {
    this.loading = true;
    this.error = '';
    this.inventoryService.getSupplier(this.supplierId).subscribe({
      next: (supplier) => {
        this.supplier = supplier;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load supplier details. Please try again.';
        console.error('Error loading supplier:', err);
        this.loading = false;
      }
    });
  }

  editSupplier() {
    this.router.navigate(['/inventory/suppliers', this.supplierId, 'edit']);
  }

  goBack() {
    this.router.navigate(['/inventory/suppliers']);
  }

  reload() {
    this.loadSupplier();
  }
}
