import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, ReconciliationRecord, InventoryItem } from '../inventory.service';

@Component({
  selector: 'app-reconcile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reconcile-container">
      <header class="page-header">
        <h1>Inventory Reconciliation</h1>
        <p>Physical count vs. system verification for accuracy</p>
      </header>
    
      <div class="actions">
        <button class="btn-primary" (click)="showReconcileForm = !showReconcileForm">
          {{ showReconcileForm ? 'Cancel' : 'Start Reconciliation' }}
        </button>
      </div>
    
      @if (showReconcileForm) {
        <div class="reconcile-form">
          <h3>Record Physical Count</h3>
          <form (ngSubmit)="addReconciliationRecord()" #reconcileForm="ngForm">
            <div class="form-row">
              <div class="form-group">
                <label for="itemSelect">Item:</label>
                <select id="itemSelect" [(ngModel)]="newReconciliation.itemId" name="itemId" required (change)="onItemChange()">
                  <option value="">Select an item...</option>
                  @for (item of allItems; track item) {
                    <option [value]="item.externalId">
                      {{ item.name }} (System: {{ item.quantityOnHand }} {{ item.unitOfMeasure }})
                    </option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label for="physicalCount">Physical Count:</label>
                <input type="number" id="physicalCount" [(ngModel)]="newReconciliation.physicalCount" name="physicalCount" min="0" step="0.01" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>System Count:</label>
                <input type="number" [value]="selectedItem?.quantityOnHand || 0" readonly>
              </div>
              <div class="form-group">
                <label>Variance:</label>
                <input type="number" [value]="getVariance()" readonly [class]="getVarianceClass()">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="reconciledBy">Reconciled By:</label>
                <input type="text" id="reconciledBy" [(ngModel)]="newReconciliation.reconciledBy" name="reconciledBy" required>
              </div>
            </div>
            <div class="form-group full-width">
              <label for="notes">Notes:</label>
              <textarea id="notes" [(ngModel)]="newReconciliation.notes" name="notes" rows="3" placeholder="Explain any discrepancies..."></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="!reconcileForm.valid">Save Reconciliation</button>
              <button type="button" class="btn-secondary" (click)="cancelReconcile()">Cancel</button>
            </div>
          </form>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="reconciliation-summary">
          <div class="summary-card">
            <h3>Total Reconciliations</h3>
            <span class="count">{{ reconciliationRecords.length }}</span>
          </div>
          <div class="summary-card">
            <h3>Items with Variance</h3>
            <span class="count">{{ getItemsWithVariance() }}</span>
          </div>
          <div class="summary-card">
            <h3>Perfect Matches</h3>
            <span class="count">{{ getPerfectMatches() }}</span>
          </div>
        </div>
      }
    
      @if (loading) {
        <div class="loading">
          <p>Loading reconciliation records...</p>
        </div>
      }
    
      @if (error) {
        <div class="error">
          <p>{{ error }}</p>
          <button class="btn-secondary" (click)="loadReconciliationRecords()">Retry</button>
        </div>
      }
    
      @if (!loading && !error) {
        <div class="reconciliation-records">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>System Count</th>
                <th>Physical Count</th>
                <th>Variance</th>
                <th>Reconciled By</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (record of reconciliationRecords; track record) {
                <tr [class]="getVarianceRowClass(record)">
                  <td>{{ record.itemName }}</td>
                  <td>{{ record.systemCount }} {{ record.unit }}</td>
                  <td>{{ record.physicalCount }} {{ record.unit }}</td>
                  <td [class]="getVarianceClassForRecord(record)">
                    {{ record.variance > 0 ? '+' : '' }}{{ record.variance }} {{ record.unit }}
                  </td>
                  <td>{{ record.reconciledBy }}</td>
                  <td>{{ record.reconciledDate | date:'short' }}</td>
                  <td>{{ record.notes || 'N/A' }}</td>
                </tr>
              }
            </tbody>
          </table>
          @if (reconciliationRecords.length === 0) {
            <div class="no-records">
              <p>No reconciliation records found. Start your first inventory count!</p>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .reconcile-container {
      padding: 20px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
      min-height: 100vh;
    }
    .page-header {
      margin-bottom: 20px;
    }
    .page-header h1 {
      color: var(--bakery-text-emph);
      margin: 0 0 0.5rem;
      font-size: 2rem;
      font-weight: 600;
    }
    .page-header p {
      color: var(--bakery-text-muted);
      margin: 0;
      font-size: 1.1rem;
    }
    .actions {
      margin-bottom: 20px;
    }
    .reconcile-form {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      margin-bottom: 30px;
      border: 1px solid var(--bakery-accent);
    }
    .reconcile-form h3 {
      margin: 0 0 20px;
      color: var(--bakery-text-emph);
      font-size: 1.25rem;
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
      padding: 8px;
      border: 1px solid var(--bakery-accent);
      border-radius: 4px;
      background: var(--bakery-bg);
      color: var(--bakery-text-emph);
    }
    .form-group input[readonly] {
      background: var(--bakery-text-muted);
      opacity: 0.7;
    }
    .form-group textarea {
      resize: vertical;
    }
    .variance-positive {
      color: var(--bakery-success);
      font-weight: 700;
    }
    .variance-negative {
      color: var(--bakery-error);
      font-weight: 700;
    }
    .variance-zero {
      color: var(--bakery-text-muted);
    }
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .reconciliation-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      text-align: center;
      border: 2px solid var(--bakery-info);
    }
    .summary-card h3 {
      margin: 0 0 10px;
      font-size: 0.9rem;
      color: var(--bakery-text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-card .count {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--bakery-text-emph);
    }
    .reconciliation-records {
      background: var(--bakery-surface);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--bakery-shadow-soft);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
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
    .variance-row-positive {
      background-color: rgba(25, 135, 84, 0.1);
    }
    .variance-row-negative {
      background-color: rgba(220, 53, 69, 0.1);
    }
    .variance-positive {
      color: var(--bakery-success);
      font-weight: 700;
    }
    .variance-negative {
      color: var(--bakery-error);
      font-weight: 700;
    }
    .variance-zero {
      color: var(--bakery-text-muted);
    }
    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
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
    .btn-primary:hover, .btn-secondary:hover {
      opacity: 0.9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
    .no-records {
      text-align: center;
      padding: 60px 20px;
      color: var(--bakery-text-muted);
      font-size: 1.1rem;
    }
  `]
})
export class ReconcileComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  reconciliationRecords: ReconciliationRecord[] = [];
  allItems: InventoryItem[] = [];
  showReconcileForm = false;
  selectedItem: InventoryItem | null = null;

  newReconciliation = {
    itemId: '',
    physicalCount: 0,
    reconciledBy: '',
    notes: ''
  };

  ngOnInit() {
    this.loadReconciliationRecords();
    this.loadAllItems();
  }

  loadReconciliationRecords() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getReconciliationRecords().subscribe({
      next: (records) => {
        this.reconciliationRecords = records;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load reconciliation records. Please try again.';
        this.loading = false;
        console.error('Error loading reconciliation records:', err);
      }
    });
  }

  loadAllItems() {
    this.inventoryService.getItems().subscribe({
      next: (items) => {
        this.allItems = items;
      },
      error: (err) => {
        console.error('Error loading items:', err);
      }
    });
  }

  onItemChange() {
    this.selectedItem = this.allItems.find(item => item.externalId === this.newReconciliation.itemId) || null;
  }

  getVariance(): number {
    if (!this.selectedItem) return 0;
    return this.newReconciliation.physicalCount - this.selectedItem.quantityOnHand;
  }

  getVarianceClass(): string {
    const variance = this.getVariance();
    if (variance > 0) return 'variance-positive';
    if (variance < 0) return 'variance-negative';
    return 'variance-zero';
  }

  addReconciliationRecord() {
    if (!this.newReconciliation.itemId || !this.newReconciliation.reconciledBy || !this.selectedItem) {
      return;
    }

    const variance = this.getVariance();
    const reconciliationRecord = {
      itemId: this.newReconciliation.itemId,
      itemName: this.selectedItem.name,
      systemCount: this.selectedItem.quantityOnHand,
      physicalCount: this.newReconciliation.physicalCount,
      variance: variance,
      unit: this.selectedItem.unitOfMeasure,
      reconciledBy: this.newReconciliation.reconciledBy,
      notes: this.newReconciliation.notes
    };

    this.inventoryService.createReconciliationRecord(reconciliationRecord).subscribe({
      next: (record) => {
        this.reconciliationRecords.unshift(record); // Add to beginning of list
        this.cancelReconcile();
      },
      error: (err) => {
        alert('Failed to save reconciliation record. Please try again.');
        console.error('Error saving reconciliation record:', err);
      }
    });
  }

  cancelReconcile() {
    this.showReconcileForm = false;
    this.selectedItem = null;
    this.newReconciliation = {
      itemId: '',
      physicalCount: 0,
      reconciledBy: '',
      notes: ''
    };
  }

  getItemsWithVariance(): number {
    return this.reconciliationRecords.filter(record => record.variance !== 0).length;
  }

  getPerfectMatches(): number {
    return this.reconciliationRecords.filter(record => record.variance === 0).length;
  }

  getVarianceRowClass(record: ReconciliationRecord): string {
    if (record.variance > 0) return 'variance-row-positive';
    if (record.variance < 0) return 'variance-row-negative';
    return '';
  }

  getVarianceClassForRecord(record: ReconciliationRecord): string {
    if (record.variance > 0) return 'variance-positive';
    if (record.variance < 0) return 'variance-negative';
    return 'variance-zero';
  }
}