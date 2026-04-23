import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, WasteRecord } from '../inventory.service';

@Component({
  selector: 'app-waste-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="waste-container">
      <header class="page-header">
        <h1>Waste Tracking</h1>
        <p>Monitor and record inventory losses to improve efficiency</p>
      </header>

      <div class="actions">
        <button class="btn-primary" (click)="showAddForm = !showAddForm">
          {{ showAddForm ? 'Cancel' : 'Record Waste' }}
        </button>
      </div>

      <div class="add-waste-form" *ngIf="showAddForm">
        <h3>Record New Waste</h3>
        <form (ngSubmit)="addWasteRecord()" #wasteForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label for="itemSelect">Item:</label>
              <select id="itemSelect" [(ngModel)]="newWaste.itemId" name="itemId" required>
                <option value="">Select an item...</option>
                <option *ngFor="let item of allItems" [value]="item.externalId">
                  {{ item.name }} ({{ item.quantityOnHand }} {{ item.unitOfMeasure }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="quantity">Quantity:</label>
              <input type="number" id="quantity" [(ngModel)]="newWaste.quantity" name="quantity" min="0.01" step="0.01" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="reason">Reason:</label>
              <select id="reason" [(ngModel)]="newWaste.reason" name="reason" required>
                <option value="">Select reason...</option>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
                <option value="spoilage">Spoilage</option>
                <option value="theft">Theft</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label for="recordedBy">Recorded By:</label>
              <input type="text" id="recordedBy" [(ngModel)]="newWaste.recordedBy" name="recordedBy" required>
            </div>
          </div>
          <div class="form-group full-width">
            <label for="notes">Notes:</label>
            <textarea id="notes" [(ngModel)]="newWaste.notes" name="notes" rows="3"></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="!wasteForm.valid">Save Waste Record</button>
            <button type="button" class="btn-secondary" (click)="cancelAdd()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="waste-summary" *ngIf="!loading && !error">
        <div class="summary-card">
          <h3>Total Waste Records</h3>
          <span class="count">{{ wasteRecords.length }}</span>
        </div>
        <div class="summary-card">
          <h3>Total Cost</h3>
          <span class="count">\${{ getTotalWasteCost().toFixed(2) }}</span>
        </div>
        <div class="summary-card">
          <h3>This Month</h3>
          <span class="count">\${{ getMonthlyWasteCost().toFixed(2) }}</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <p>Loading waste records...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadWasteRecords()">Retry</button>
      </div>

      <div class="waste-records" *ngIf="!loading && !error">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Cost</th>
              <th>Recorded By</th>
              <th>Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of wasteRecords">
              <td>{{ record.itemName }}</td>
              <td>{{ record.quantity }} {{ record.unit }}</td>
              <td>
                <span class="reason-badge" [class]="record.reason">
                  {{ record.reason | titlecase }}
                </span>
              </td>
              <td>\${{ record.cost.toFixed(2) }}</td>
              <td>{{ record.recordedBy }}</td>
              <td>{{ record.recordedDate | date:'short' }}</td>
              <td>{{ record.notes || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="no-records" *ngIf="wasteRecords.length === 0">
          <p>✅ No waste records found. Great job minimizing losses!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waste-container {
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
    .add-waste-form {
      background: var(--bakery-surface);
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      margin-bottom: 30px;
      border: 1px solid var(--bakery-accent);
    }
    .add-waste-form h3 {
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
    .form-group textarea {
      resize: vertical;
    }
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .waste-summary {
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
      border: 2px solid var(--bakery-warning);
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
    .waste-records {
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
    .reason-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .reason-badge.expired {
      background: var(--bakery-error);
      color: white;
    }
    .reason-badge.damaged {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .reason-badge.spoilage {
      background: var(--bakery-error);
      color: white;
    }
    .reason-badge.theft {
      background: var(--bakery-error);
      color: white;
    }
    .reason-badge.other {
      background: var(--bakery-text-muted);
      color: white;
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
      color: var(--bakery-success);
      font-size: 1.1rem;
    }
  `]
})
export class WasteTrackingComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  loading = false;
  error = '';
  wasteRecords: WasteRecord[] = [];
  allItems: any[] = [];
  showAddForm = false;

  newWaste = {
    itemId: '',
    quantity: 0,
    reason: '' as 'expired' | 'damaged' | 'spoilage' | 'theft' | 'other',
    recordedBy: '',
    notes: ''
  };

  ngOnInit() {
    this.loadWasteRecords();
    this.loadAllItems();
  }

  loadWasteRecords() {
    this.loading = true;
    this.error = '';

    this.inventoryService.getWasteRecords().subscribe({
      next: (records) => {
        this.wasteRecords = records;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load waste records. Please try again.';
        this.loading = false;
        console.error('Error loading waste records:', err);
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

  addWasteRecord() {
    if (!this.newWaste.itemId || !this.newWaste.quantity || !this.newWaste.reason || !this.newWaste.recordedBy) {
      return;
    }

    // Find the selected item to get unit and calculate cost
    const selectedItem = this.allItems.find(item => item.externalId === this.newWaste.itemId);
    if (!selectedItem) return;

    const wasteRecord = {
      itemId: this.newWaste.itemId,
      itemName: selectedItem.name,
      quantity: this.newWaste.quantity,
      unit: selectedItem.unitOfMeasure,
      reason: this.newWaste.reason,
      cost: this.newWaste.quantity * selectedItem.unitCost,
      recordedBy: this.newWaste.recordedBy,
      notes: this.newWaste.notes
    };

    this.inventoryService.createWasteRecord(wasteRecord).subscribe({
      next: (record: WasteRecord) => {
        this.wasteRecords.unshift(record); // Add to beginning of list
        this.cancelAdd();
      },
      error: (err: any) => {
        alert('Failed to save waste record. Please try again.');
        console.error('Error saving waste record:', err);
      }
    });
  }

  cancelAdd() {
    this.showAddForm = false;
    this.newWaste = {
      itemId: '',
      quantity: 0,
      reason: '' as any,
      recordedBy: '',
      notes: ''
    };
  }

  getTotalWasteCost(): number {
    return this.wasteRecords.reduce((total, record) => total + record.cost, 0);
  }

  getMonthlyWasteCost(): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return this.wasteRecords
      .filter(record => new Date(record.recordedDate) >= thisMonth)
      .reduce((total, record) => total + record.cost, 0);
  }
}