import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, Batch } from '../inventory.service';

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="batch-container">
      <header class="page-header">
        <h1>Inventory Batches</h1>
        <div class="actions">
          <button class="btn-primary" (click)="addBatch()">Add Batch</button>
        </div>
      </header>

      <div class="filters">
        <input type="text" placeholder="Search batches..." [(ngModel)]="searchTerm" (input)="filterBatches()">
        <select [(ngModel)]="statusFilter" (change)="filterBatches()">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="used">Used</option>
        </select>
        <input type="date" [(ngModel)]="dateFilter" (change)="filterBatches()" placeholder="Filter by date">
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading batches...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadBatches()">Retry</button>
      </div>

      <div class="batches-table" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Cost/Unit</th>
              <th>Supplier</th>
              <th>Received Date</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let batch of filteredBatches"
                [class.expired]="batch.status === 'expired'"
                [class.used]="batch.status === 'used'">
              <td>{{ batch.batchNumber }}</td>
              <td>{{ batch.itemName }}</td>
              <td>{{ batch.quantity }}</td>
              <td>{{ batch.unit }}</td>
              <td>\${{ batch.costPerUnit.toFixed(2) }}</td>
              <td>{{ batch.supplier }}</td>
              <td>{{ batch.receivedDate | date:'shortDate' }}</td>
              <td>{{ batch.expirationDate ? (batch.expirationDate | date:'shortDate') : 'N/A' }}</td>
              <td>
                <span class="status-badge" [class]="batch.status">
                  {{ batch.status | titlecase }}
                </span>
              </td>
              <td>
                <button class="btn-view" (click)="viewBatch(batch.id)">View</button>
                <button class="btn-edit" (click)="editBatch(batch.id)">Edit</button>
                <button class="btn-trace" (click)="traceBatch(batch.id)">Trace</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="no-batches" *ngIf="filteredBatches.length === 0">
          <p>No batches found matching your criteria.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .batch-container {
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
    .batches-table {
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
    .expired { background-color: var(--bakery-error); opacity: 0.7; }
    .used { background-color: var(--bakery-text-muted); opacity: 0.6; }
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
    .status-badge.expired {
      background: var(--bakery-error);
      color: white;
    }
    .status-badge.used {
      background: var(--bakery-text-muted);
      color: white;
    }
    .btn-primary, .btn-secondary, .btn-view, .btn-edit, .btn-trace {
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
    .btn-view {
      background: var(--bakery-info);
      color: white;
    }
    .btn-edit {
      background: var(--bakery-accent-2);
      color: var(--bakery-text-emph);
    }
    .btn-trace {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .btn-primary:hover, .btn-view:hover, .btn-edit:hover, .btn-trace:hover {
      opacity: 0.9;
    }
    input, select {
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-surface);
      color: var(--bakery-text-emph);
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
    .no-batches {
      text-align: center;
      padding: 40px;
      color: var(--bakery-text-muted);
    }
  `]
})
export class BatchListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  searchTerm = '';
  statusFilter = '';
  dateFilter = '';
  loading = false;
  error = '';

  batches: Batch[] = [];
  filteredBatches: Batch[] = [];

  ngOnInit() {
    this.loadBatches();
  }

  loadBatches() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getBatches().subscribe({
      next: (batches) => {
        this.batches = batches;
        this.filterBatches();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load batches. Please try again.';
        this.loading = false;
        console.error('Error loading batches:', err);
      }
    });
  }

  filterBatches() {
    this.filteredBatches = this.batches.filter(batch => {
      const matchesSearch = batch.batchNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           batch.itemName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           batch.supplier.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.statusFilter || batch.status === this.statusFilter;
      const matchesDate = !this.dateFilter || batch.receivedDate.startsWith(this.dateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  addBatch() {
    this.router.navigate(['/inventory/batches/add']);
  }

  viewBatch(id: string) {
    this.router.navigate(['/inventory/batches', id]);
  }

  editBatch(id: string) {
    this.router.navigate(['/inventory/batches', id, 'edit']);
  }

  traceBatch(id: string) {
    this.router.navigate(['/inventory/batches', id, 'trace']);
  }
}