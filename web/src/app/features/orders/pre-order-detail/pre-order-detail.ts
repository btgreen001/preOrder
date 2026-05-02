import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';  
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order, AvailablePickupSlot } from '../services/pre-orders.service';


@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

        <div class="pickup-slot-change" *ngIf="canChangePickupSlot(order.orderStatus)">
          <p class="pickup-slot-help">You can change your pickup slot while this order is still pending or submitted.</p>
          <div class="notice notice-success" *ngIf="pickupSlotNotice">{{ pickupSlotNotice }}</div>
          <div class="notice notice-error" *ngIf="pickupSlotError">{{ pickupSlotError }}</div>
          <p class="pickup-slot-help" *ngIf="isLoadingPickupSlots">Checking available pickup slots...</p>

          <ng-container *ngIf="!isLoadingPickupSlots && hasAlternatePickupSlots(); else noAlternateSlots">
            <label class="pickup-slot-field">
              <span>Pickup slot</span>
              <select [(ngModel)]="selectedPickupSlotExternalId" [disabled]="isChangingPickupSlot">
                <option *ngFor="let slot of availablePickupSlots" [ngValue]="slot.externalId">
                  {{ formatPickupSlotOption(slot) }}
                </option>
              </select>
            </label>
            <button class="btn" type="button" (click)="changePickupSlot()" [disabled]="isChangingPickupSlot || !canSubmitPickupSlotChange()">
              {{ isChangingPickupSlot ? 'Updating...' : 'Change Pickup Slot' }}
            </button>
          </ng-container>

          <ng-template #noAlternateSlots>
            <p class="pickup-slot-help" *ngIf="!isLoadingPickupSlots">No alternate pickup slots are currently available.</p>
          </ng-template>
        </div>
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
    .pickup-slot-change {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--bakery-border);
    }
    .pickup-slot-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 12px 0;
    }
    .pickup-slot-field span,
    .pickup-slot-help {
      color: var(--bakery-text-muted);
      font-size: 0.95rem;
    }
    .pickup-slot-field select {
      max-width: 100%;
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
    .status-SUBMITTED,
    .status-submitted,
    .status-PENDING,
    .status-pending {
      background: color-mix(in srgb, var(--bakery-warning) 24%, white);
      color: #7c2d12;
      border: 1px solid color-mix(in srgb, var(--bakery-warning) 55%, transparent);
    }
    .status-CONFIRMED,
    .status-confirmed {
      background: color-mix(in srgb, var(--bakery-primary) 22%, white);
      color: #9a3412;
      border: 1px solid color-mix(in srgb, var(--bakery-primary) 50%, transparent);
    }
    .status-DELIVERED,
    .status-delivered,
    .status-COMPLETED,
    .status-completed {
      background: color-mix(in srgb, var(--bakery-success) 22%, white);
      color: #166534;
      border: 1px solid color-mix(in srgb, var(--bakery-success) 50%, transparent);
    }
    .status-CANCELLED,
    .status-cancelled {
      background: color-mix(in srgb, var(--bakery-error) 18%, white);
      color: #991b1b;
      border: 1px solid color-mix(in srgb, var(--bakery-error) 45%, transparent);
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
  availablePickupSlots: AvailablePickupSlot[] = [];
  selectedPickupSlotExternalId = '';
  isLoadingPickupSlots = false;
  isChangingPickupSlot = false;
  isCancelling = false;
  cancelNotice = '';
  cancelError = '';
  pickupSlotNotice = '';
  pickupSlotError = '';
  private route = inject(ActivatedRoute);
  private orders = inject(OrdersService);
  private snackBar = inject(MatSnackBar);

  constructor() {
    const externalId = this.getExternalIdFromRoute();
    if (!externalId) {
      return;
    }

    this.orders.getOrderByExternalId(externalId).subscribe((o: Order) => {
      this.order = o;
      this.selectedPickupSlotExternalId = o.pickupSlot?.externalId ?? '';
      this.loadAvailablePickupSlots();
    });
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
        this.availablePickupSlots = [];
        this.isCancelling = false;
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.cancelError = apiMessage || 'Unable to cancel the order right now. Please try again.';
        this.isCancelling = false;
      }
    });
  }

  changePickupSlot() {
    if (!this.order || this.isChangingPickupSlot || !this.canSubmitPickupSlotChange()) {
      return;
    }

    this.isChangingPickupSlot = true;
    this.pickupSlotError = '';
    this.pickupSlotNotice = '';

    this.orders.changePickupSlot(this.order.externalId, { pickupSlotExternalId: this.selectedPickupSlotExternalId }).subscribe({
      next: updatedOrder => {
        this.order = updatedOrder;
        this.selectedPickupSlotExternalId = updatedOrder.pickupSlot?.externalId ?? '';
        this.pickupSlotNotice = 'Your pickup slot has been updated.';
        this.isChangingPickupSlot = false;
        this.loadAvailablePickupSlots();
        this.snackBar.open('Pickup slot updated successfully.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.pickupSlotError = apiMessage || 'Unable to change the pickup slot right now. Please try again.';
        this.isChangingPickupSlot = false;
      }
    });
  }

  canCancel(status: string): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'PENDING' || normalized === 'SUBMITTED';
  }

  canChangePickupSlot(status: string): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'PENDING' || normalized === 'SUBMITTED';
  }

  canSubmitPickupSlotChange(): boolean {
    return !!this.order
      && !!this.selectedPickupSlotExternalId
      && this.selectedPickupSlotExternalId !== (this.order.pickupSlot?.externalId ?? '');
  }

  hasAlternatePickupSlots(): boolean {
    const currentSlotExternalId = this.order?.pickupSlot?.externalId ?? '';
    return this.availablePickupSlots.some(slot => slot.externalId !== currentSlotExternalId);
  }

  formatPickupSlotOption(slot: AvailablePickupSlot): string {
    const start = new Date(slot.slotStartAt);
    const end = new Date(slot.slotEndAt);
    const seatsLeft = Math.max(slot.capacity - slot.reservedCount, 0);
    const isCurrent = slot.externalId === this.order?.pickupSlot?.externalId;
    const startText = start.toLocaleString();
    const endText = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const seatsText = `${seatsLeft} slot${seatsLeft === 1 ? '' : 's'} left`;

    return `${startText} - ${endText} | ${seatsText}${isCurrent ? ' | current' : ''}`;
  }

  private loadAvailablePickupSlots(): void {
    if (!this.order || !this.canChangePickupSlot(this.order.orderStatus)) {
      this.availablePickupSlots = [];
      return;
    }

    const organizationToken = this.order.organization?.registrationToken?.trim() ?? '';
    const holidayEventExternalId = this.order.eventToken?.trim() ?? '';
    if (!organizationToken || !holidayEventExternalId) {
      this.availablePickupSlots = [];
      return;
    }

    this.isLoadingPickupSlots = true;
    this.pickupSlotError = '';

    this.orders.getAvailablePickupSlots(organizationToken, holidayEventExternalId).subscribe({
      next: slots => {
        const currentSlotExternalId = this.order?.pickupSlot?.externalId ?? '';
        this.availablePickupSlots = slots.filter(slot => slot.externalId === currentSlotExternalId || slot.reservedCount < slot.capacity);
        if (!this.availablePickupSlots.some(slot => slot.externalId === this.selectedPickupSlotExternalId)) {
          this.selectedPickupSlotExternalId = (currentSlotExternalId || this.availablePickupSlots[0]?.externalId) ?? '';
        }
        this.isLoadingPickupSlots = false;
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.pickupSlotError = apiMessage || 'Unable to load available pickup slots right now.';
        this.availablePickupSlots = [];
        this.isLoadingPickupSlots = false;
      }
    });
  }
}
