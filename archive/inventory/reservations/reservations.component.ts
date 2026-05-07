import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../inventory/inventory.service';

export interface Reservation {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  orderId: string;
  reservedDate: string;
  status: string;
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reservations-container">
      <header class="page-header">
        <h1>Inventory Reservations</h1>
        <p>View and manage reserved inventory items</p>
      </header>

      <div class="summary-cards">
        <div class="summary-card" [attr.data-testid]="'total-reservations-card'">
          <h3>Total Reservations</h3>
          <p class="metric">{{ totalReservations }}</p>
        </div>
        <div class="summary-card" [attr.data-testid]="'reserved-quantity-card'">
          <h3>Total Quantity Reserved</h3>
          <p class="metric">{{ totalQuantityReserved }}</p>
        </div>
        <div class="summary-card" [attr.data-testid]="'active-orders-card'">
          <h3>Orders with Reservations</h3>
          <p class="metric">{{ uniqueOrders }}</p>
        </div>
      </div>

      <div class="reservations-section">
        <button (click)="loadReservations()" [attr.data-testid]="'refresh-btn'" class="refresh-btn">Refresh</button>
        
        <div class="loading" *ngIf="loading" [attr.data-testid]="'loading-spinner'">
          <p>Loading reservations...</p>
        </div>

        <table *ngIf="reservations.length > 0" [attr.data-testid]="'reservations-table'">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Reserved Qty</th>
              <th>Order ID</th>
              <th>Reserved Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let reservation of reservations" [attr.data-testid]="'reservation-row-' + reservation.id">
              <td>{{ reservation.itemId }}</td>
              <td>{{ reservation.itemName }}</td>
              <td class="quantity">{{ reservation.quantity }}</td>
              <td><span class="order-id">{{ reservation.orderId }}</span></td>
              <td>{{ reservation.reservedDate | date:'short' }}</td>
              <td><span class="status-badge" [class]="reservation.status.toLowerCase()">{{ reservation.status }}</span></td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && reservations.length === 0" class="no-items">
          <p>No active reservations</p>
        </div>
      </div>

      <div class="info-section">
        <h2>About Reservations</h2>
        <p>Reservations hold inventory items for specific orders during the fulfillment process. When an order is completed or cancelled, its reservations are automatically released.</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .reservations-container { padding: 20px; }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .summary-card {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2196F3;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .summary-card h3 { margin: 0 0 10px; font-size: 0.95rem; color: #666; }
    .summary-card .metric { margin: 0; font-size: 2rem; font-weight: bold; color: #2196F3; }
    .refresh-btn { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .quantity { text-align: center; font-weight: 500; }
    .order-id { background: #e3f2fd; padding: 2px 8px; border-radius: 3px; font-family: monospace; font-size: 0.85rem; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .status-badge.active { background: #c8e6c9; color: #1b5e20; }
    .status-badge.released { background: #ffccbc; color: #bf360c; }
    .status-badge.fulfilled { background: #e1f5fe; color: #01579b; }
    .loading { text-align: center; padding: 20px; color: #0066cc; }
    .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .no-items { text-align: center; padding: 20px; color: #999; }
    .info-section { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .info-section h2 { margin-top: 0; font-size: 1.2rem; }
  `]
})
export class ReservationsComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  reservations: Reservation[] = [];
  totalReservations = 0;
  totalQuantityReserved = 0;
  uniqueOrders = 0;
  loading = false;
  error: string | null = null;

  ngOnInit() {
    this.loadReservations();
  }

  loadReservations() {
    this.loading = true;
    this.error = null;

    // For now, create mock data structure
    // In a real scenario, the backend would have a reservations endpoint
    this.reservations = [
      {
        id: '1',
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        itemName: 'Flour - All Purpose',
        quantity: 50,
        orderId: '650e8400-e29b-41d4-a716-446655440001',
        reservedDate: new Date().toISOString(),
        status: 'Active'
      },
      {
        id: '2',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        itemName: 'Sugar - Granulated',
        quantity: 25,
        orderId: '650e8400-e29b-41d4-a716-446655440001',
        reservedDate: new Date().toISOString(),
        status: 'Active'
      },
      {
        id: '3',
        itemId: '550e8400-e29b-41d4-a716-446655440003',
        itemName: 'Butter - Unsalted',
        quantity: 10,
        orderId: '650e8400-e29b-41d4-a716-446655440002',
        reservedDate: new Date().toISOString(),
        status: 'Active'
      }
    ];

    this.totalReservations = this.reservations.length;
    this.totalQuantityReserved = this.reservations.reduce((sum, r) => sum + r.quantity, 0);
    this.uniqueOrders = new Set(this.reservations.map(r => r.orderId)).size;
    this.loading = false;
  }
}
