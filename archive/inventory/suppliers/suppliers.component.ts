import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, Supplier } from '../inventory.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="suppliers-container">
      <header class="page-header">
        <h1>Supplier Management</h1>
        <div class="actions">
          <button class="btn-primary" (click)="addSupplier()">Add Supplier</button>
        </div>
      </header>

      <div class="filters">
        <input type="text" placeholder="Search suppliers..." [(ngModel)]="searchTerm" (input)="filterSuppliers()">
        <select [(ngModel)]="statusFilter" (change)="filterSuppliers()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading suppliers...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadSuppliers()">Retry</button>
      </div>

      <div class="suppliers-table" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Payment Terms</th>
              <th>Lead Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let supplier of filteredSuppliers" [class.inactive]="!supplier.active">
              <td>{{ supplier.name }}</td>
              <td>{{ supplier.contactName }}</td>
              <td><a [href]="'mailto:' + supplier.email">{{ supplier.email }}</a></td>
              <td><a [href]="'tel:' + supplier.phone">{{ supplier.phone }}</a></td>
              <td>{{ supplier.paymentTerms }}</td>
              <td>{{ supplier.leadTime }} days</td>
              <td>
                <span class="status-badge" [class.active]="supplier.active" [class.inactive]="!supplier.active">
                  {{ supplier.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <button class="btn-view" (click)="viewSupplier(supplier.id)">View</button>
                <button class="btn-edit" (click)="editSupplier(supplier.id)">Edit</button>
                <button class="btn-orders" (click)="viewOrders(supplier.id)">Orders</button>
                <button class="btn-toggle" (click)="toggleStatus(supplier)">
                  {{ supplier.active ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="no-suppliers" *ngIf="filteredSuppliers.length === 0">
          <p>No suppliers found matching your criteria.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .suppliers-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }
    .actions { display: flex; gap: 10px; }
    .filters {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: var(--bakery-surface);
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .suppliers-table {
      background: var(--bakery-surface);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--bakery-shadow-soft);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--bakery-accent);
      color: var(--bakery-text-emph);
    }
    th {
      background: var(--bakery-accent-2);
      font-weight: 600;
      color: var(--bakery-text-emph);
    }
    .inactive { opacity: 0.6; }
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.active {
      background: var(--bakery-success);
      color: white;
    }
    .status-badge.inactive {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-primary, .btn-secondary, .btn-edit, .btn-orders, .btn-toggle {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      margin-right: 5px;
      font-weight: 500;
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
    .btn-edit {
      background: var(--bakery-info);
      color: white;
    }
    .btn-view {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }
    .btn-orders {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }
    .btn-toggle {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .btn-primary:hover, .btn-edit:hover, .btn-orders:hover, .btn-toggle:hover {
      opacity: 0.9;
    }
    input, select {
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
    }
    a {
      color: var(--bakery-accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
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
    .no-suppliers {
      text-align: center;
      padding: 40px;
      color: var(--bakery-text-muted);
    }
  `]
})
export class SuppliersComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  searchTerm = '';
  statusFilter = '';
  loading = false;
  error = '';

  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getSuppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.filterSuppliers();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load suppliers. Please try again.';
        this.loading = false;
        console.error('Error loading suppliers:', err);
      }
    });
  }

  filterSuppliers() {
    this.filteredSuppliers = this.suppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           supplier.contactName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           supplier.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.statusFilter ||
        (this.statusFilter === 'active' && supplier.active) ||
        (this.statusFilter === 'inactive' && !supplier.active);
      return matchesSearch && matchesStatus;
    });
  }

  addSupplier() {
    this.router.navigate(['/inventory/suppliers/add']);
  }

  editSupplier(id: string) {
    this.router.navigate(['/inventory/suppliers', id, 'edit']);
  }

  viewSupplier(id: string) {
    this.router.navigate(['/inventory/suppliers', id]);
  }

  viewOrders(id: string) {
    this.router.navigate(['/inventory/suppliers', id, 'orders']);
  }

  toggleStatus(supplier: Supplier) {
    const action = supplier.active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this supplier?`)) {
      this.inventoryService.updateSupplier(supplier.id, { active: !supplier.active }).subscribe({
        next: () => {
          this.loadSuppliers(); // Reload the list
        },
        error: (err) => {
          alert(`Failed to ${action} supplier. Please try again.`);
          console.error(`Error ${action}ing supplier:`, err);
        }
      });
    }
  }
}