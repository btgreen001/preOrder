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
    @if (order) {
      <div class="order-detail-container">
        <header class="page-header">
          <h1>Order Details</h1>
          <button class="btn-cancel" (click)="cancelOrder()" [disabled]="isCancelling || !canCancel(order.orderStatus)">
            {{ isCancelling ? 'Cancelling...' : 'Cancel Order' }}
          </button>
          <button class="btn" (click)="startAnotherOrder()">
            Place Another Order
          </button>
        </header>
        @if (cancelNotice) {
          <div class="notice notice-success">{{ cancelNotice }}</div>
        }
        @if (cancelError) {
          <div class="notice notice-error">{{ cancelError }}</div>
        }
        <div class="order-info">
          <p><strong>Order ID:</strong> {{ order.id }}</p>
          <p><strong>Confirmation:</strong> {{ order.externalId }}</p>
          <p><strong>Order Date:</strong> {{ order.orderDate | date:'medium' }}</p>
          <p><strong>Status:</strong> <span class="status-badge status-{{ order.orderStatus }}">{{ order.orderStatus | titlecase }}</span></p>
          <p><strong>Event:</strong> {{ order.eventName }}</p>
          <p><strong>Customer:</strong> {{ order.customerName }}</p>
          <p><strong>Total:</strong> {{ order.totalAmount | currency:'USD':'symbol':'1.2-2' }}</p>
        </div>
        @if (order.items?.length) {
          <div class="order-items">
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
                @for (item of order.items; track item) {
                  <tr>
                    <td>{{ item.menuItemName }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</td>
                    <td>{{ item.lineTotal | currency:'USD':'symbol':'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (order.pickupSlot) {
          <div class="pickup-location">
            <h2>Pickup Location</h2>
            <p>{{ order.organization?.organizationName }}</p>
            <p>{{ order.organization?.addressLine1 }} {{ order.organization?.addressLine2 }}</p>
            <p>{{ order.organization?.city }}@if (order.organization?.state) {,  {{ order.organization.state }} }</p>
            <p></p>
            @if (order.organization?.contactPhone) {
              <p><strong>Phone:</strong> {{ order.organization.contactPhone }}</p>
            }
            @if (order.organization?.contactEmail) {
              <p><strong>Email:</strong> {{ order.organization.contactEmail }}</p>
            }
          </div>
        }
        @if (order.pickupSlot) {
          <div class="pickup-slot">
            <h2>Pickup Time</h2>
            <p><strong>Start:</strong> {{ order.pickupSlot.slotStartAt | date:'short' }} (local time)</p>
            <p><strong>End:</strong> {{ order.pickupSlot.slotEndAt | date:'short' }} (local time)</p>
            @if (canChangePickupSlot(order.orderStatus)) {
              <div class="pickup-slot-change">
                <p class="pickup-slot-help">You can change your pickup slot while this order is still pending or submitted.</p>
                @if (pickupSlotNotice) {
                  <div class="notice notice-success">{{ pickupSlotNotice }}</div>
                }
                @if (pickupSlotError) {
                  <div class="notice notice-error">{{ pickupSlotError }}</div>
                }
                @if (isLoadingPickupSlots) {
                  <p class="pickup-slot-help">Checking available pickup slots...</p>
                }
                @if (!isLoadingPickupSlots && hasAlternatePickupSlots()) {
                  <label class="pickup-slot-field">
                    <span>Pickup slot</span>
                    <select [(ngModel)]="selectedPickupSlotExternalId" [disabled]="isChangingPickupSlot">
                      @for (slot of availablePickupSlots; track slot) {
                        <option [ngValue]="slot.externalId">
                          {{ formatPickupSlotOption(slot) }}
                        </option>
                      }
                    </select>
                  </label>
                  <button class="btn" type="button" (click)="changePickupSlot()" [disabled]="isChangingPickupSlot || !canSubmitPickupSlotChange()">
                    {{ isChangingPickupSlot ? 'Updating...' : 'Change Pickup Slot' }}
                  </button>
                } @else {
                  @if (!isLoadingPickupSlots) {
                    <p class="pickup-slot-help">No alternate pickup slots are currently available.</p>
                  }
                }
              </div>
            }
          </div>
        }
      </div>
    }
    @if (!order) {
      <div>
        <p>Order not found.</p>
      </div>
    }
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
  order: Order | null = null;
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
    if (confirm('Are you sure you want to cancel this order?')) {
      // proceed with cancellation
    } else {
      return; // user cancelled the action
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
        this.availablePickupSlots = [];
        this.isCancelling = false;
        this.snackBar.open('Order cancelled successfully.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
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
