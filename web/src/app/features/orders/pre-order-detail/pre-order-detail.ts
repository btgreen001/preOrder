import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order } from '../services/pre-orders.service';


@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-detail-container" *ngIf="order">
      <header class="page-header">
        <h1>Order Details</h1>
        <button class="btn-cancel" (click)="cancelOrder()" [disabled]="isCancelling || !canCancel(order.orderStatus)">
          {{ isCancelling ? 'Cancelling...' : 'Cancel Order' }}
        </button>
      <button class="btn" (click)="startAnotherOrder()">
          Place Another Order
        </button>
      </header>
      <div class="notice notice-success" *ngIf="cancelNotice">{{ cancelNotice }}</div>
      <div class="notice notice-error" *ngIf="cancelError">{{ cancelError }}</div>
      <div class="order-info">
        <p><strong>Order ID:</strong> {{ order.externalId }}</p>
        <p><strong>Order Date:</strong> {{ order.orderDate | date:'medium' }}</p>
        <p><strong>Status:</strong> <span class="status-badge status-{{ order.orderStatus }}">{{ order.orderStatus | titlecase }}</span></p>
        <p><strong>Event:</strong> {{ order.eventName }}</p>
        <p><strong>Customer:</strong> {{ order.customerName }}</p>
        <p><strong>Total:</strong> {{ order.totalAmount | currency:'USD':'symbol':'1.2-2' }}</p>
      </div>
      <div class="order-items" *ngIf="order.items?.length">
        <h2>Items</h2>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of order.items">
              <td>{{ item.menuItemName }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</td>
              <td>{{ item.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pickup-location" *ngIf="order.pickupSlot">
        <h2>Pickup Location</h2>
        <p><strong>Merchant:</strong> {{ order.organization?.organizationName }}</p>
        <p><strong>Address:</strong> {{ order.organization?.addressLine1 }} {{ order.organization?.addressLine2 }}</p>
        <p><strong>City:</strong> {{ order.organization?.city }}</p>
        <p><strong>State:</strong> {{ order.organization?.state }}</p>
        <p><strong>Phone:</strong> {{ order.organization?.contactPhone }}</p>
        <p><strong>Email:</strong> {{ order.organization?.contactEmail }}</p>
      </div>

      <div class="pickup-slot" *ngIf="order.pickupSlot">
        <h2>Pickup Time</h2>
        <p><strong>Start:</strong> {{ order.pickupSlot.slotStartAt | date:'short' }} (local time)</p>
        <p><strong>End:</strong> {{ order.pickupSlot.slotEndAt | date:'short' }} (local time)</p>
      </div>
    </div>
    <div *ngIf="!order">
      <p>Order not found.</p>
    </div>
  `,
  styles: [`
    .order-detail-container {
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
    .order-info {
      background: var(--bakery-surface);
      padding: 30px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .event-info {
      background: var(--bakery-surface);
      padding: 30px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
    }
    .pickup-location,
    .pickup-slot,
    .order-items {
      background: var(--bakery-surface);
      padding: 24px;
      border-radius: 8px;
      box-shadow: var(--bakery-shadow-soft);
      margin-top: 20px;
    }
    .pickup-location h2,
    .pickup-slot h2,
    .order-items h2 {
      margin: 0 0 12px;
    }
    .pickup-location p,
    .pickup-slot p {
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table th,
    .items-table td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--bakery-accent);
    }
    .notice {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 0.95rem;
      border: 1px solid transparent;
    }
    .notice-success {
      background: color-mix(in srgb, var(--bakery-success) 18%, transparent);
      border-color: color-mix(in srgb, var(--bakery-success) 45%, transparent);
      color: var(--bakery-text-emph);
    }
    .notice-error {
      background: color-mix(in srgb, var(--bakery-error) 18%, transparent);
      border-color: color-mix(in srgb, var(--bakery-error) 45%, transparent);
      color: var(--bakery-text-emph);
    }
    .order-info p {
      margin: 15px 0;
      font-size: 1.1rem;
      line-height: 1.6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .order-info strong {
      color: var(--bakery-text-emph);
      font-weight: 600;
      min-width: 120px;
    }
    .event-info p {
      margin: 15px 0;
      font-size: 1.1rem;
      line-height: 1.6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .event-info strong {
      color: var(--bakery-text-emph);
      font-weight: 600;
      min-width: 120px;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-pending {
      background: var(--bakery-warning);
      color: var(--bakery-text-emph);
    }
    .status-processing {
      background: var(--bakery-primary);
      color: var(--bakery-text-emph);
    }
    .status-completed {
      background: var(--bakery-success);
      color: var(--bakery-text-emph);
    }
    .status-cancelled {
      background: var(--bakery-error);
      color: var(--bakery-text-emph);
    }
    .btn {
      padding: 10px 20px;
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background: var(--bakery-accent-2);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-cancel {
      padding: 10px 20px;
      background: var(--bakery-accent);
      color: var(--bakery-text-emph);
      border: 1px solid var(--bakery-text-muted);
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background-color 0.2s;
    }
    .btn-cancel:hover {
      background: var(--bakery-accent-2);
    }
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }
      .order-info {
        padding: 20px;
      }
      .order-info p {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
      .event-info {
        padding: 20px;
      }
      .event-info p {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }    }
  `]
})
export class OrderDetailComponent {
  order: Order | undefined;
  isCancelling = false;
  cancelNotice = '';
  cancelError = '';
  private route = inject(ActivatedRoute);
  private orders = inject(OrdersService);

  constructor() {
    const externalId = this.getExternalIdFromRoute();
    if (!externalId) {
      return;
    }

    this.orders.getOrderByExternalId(externalId).subscribe((o: Order) => this.order = o);
  }

  private getExternalIdFromRoute(): string {
    const queryExternalId = this.route.snapshot.queryParamMap.get('externalId')?.trim();
    if (queryExternalId) {
      return queryExternalId;
    }

    const paramExternalId = this.route.snapshot.paramMap.get('externalId')?.trim();
    if (paramExternalId) {
      return paramExternalId;
    }

    return this.route.snapshot.paramMap.get('id')?.trim() ?? '';
  }
startAnotherOrder() {
    const eventToken = this.order?.organization?.registrationToken?.trim() || this.route.snapshot.queryParamMap.get('eventToken')?.trim() || this.route.snapshot.queryParamMap.get('org')?.trim() || this.route.snapshot.paramMap.get('eventToken')?.trim() || this.route.snapshot.paramMap.get('org')?.trim() || '';
    if (eventToken) {
      window.location.href = `/BakeAhead?org=${encodeURIComponent(eventToken)}`;
      return;
    }

    window.location.href = '/BakeAhead';
  }
  cancelOrder() {
    if (!this.order || this.isCancelling) {
      return;
    }

    if (!this.canCancel(this.order.orderStatus)) {
      this.cancelError = `Order cannot be cancelled from status '${this.order.orderStatus}'.`;
      this.cancelNotice = '';
      return;
    }

    this.isCancelling = true;
    this.cancelError = '';
    this.cancelNotice = '';

    this.orders.cancelOrder(this.order.externalId).subscribe({
      next: updatedOrder => {
        this.order = updatedOrder;
        this.cancelNotice = 'Your order has been cancelled.';
        this.isCancelling = false;
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.cancelError = apiMessage || 'Unable to cancel the order right now. Please try again.';
        this.isCancelling = false;
      }
    });
  }

  canCancel(status: string): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'PENDING' || normalized === 'SUBMITTED';
  }
}
