import { Component, inject, signal, effect, computed } from '@angular/core';
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
    @if (order()) {
      <div class="order-detail-container">
        <header class="page-header">
          <h1>Order Details</h1>

          <button class="btn-cancel"
                  (click)="cancelOrder()"
                  [disabled]="isCancelling() || !canCancel(order()?.orderStatus)">
            {{ isCancelling() ? 'Cancelling...' : 'Cancel Order' }}
          </button>

          <button class="btn" (click)="startAnotherOrder()">
            Place Another Order
          </button>
        </header>

        @if (cancelNotice()) {
          <div class="notice notice-success">{{ cancelNotice() }}</div>
        }
        @if (cancelError()) {
          <div class="notice notice-error">{{ cancelError() }}</div>
        }

        <div class="order-info">
          <p><strong>Order ID:</strong> {{ order()?.id }}</p>
          <p><strong>Confirmation:</strong> {{ order()?.externalId }}</p>
          <p><strong>Order Date:</strong> {{ order()?.orderDate | date:'medium' }}</p>
          <p><strong>Status:</strong>
            <span class="status-badge status-{{ order()?.orderStatus }}">
              {{ order()?.orderStatus | titlecase }}
            </span>
          </p>
          <p><strong>Event:</strong> {{ order()?.eventName }}</p>
          <p><strong>Customer:</strong> {{ order()?.customerName }}</p>
          <p><strong>Total:</strong> {{ order()?.totalAmount | currency:'USD':'symbol':'1.2-2' }}</p>
        </div>

        @if (order()?.items?.length) {
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
                @for (item of order()?.items; track item) {
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

        @if (order()?.pickupSlot) {
          <div class="pickup-location">
            <h2>Pickup Location</h2>
            <p>{{ order()?.organization?.organizationName }}</p>
            <p>{{ order()?.organization?.addressLine1 }} {{ order()?.organization?.addressLine2 }}</p>
            <p>{{ order()?.organization?.city }}
              @if (order()?.organization?.state) {, {{ order()?.organization?.state }} }
            </p>

            @if (order()?.organization?.contactPhone) {
              <p><strong>Phone:</strong> {{ order()?.organization?.contactPhone }}</p>
            }
            @if (order()?.organization?.contactEmail) {
              <p><strong>Email:</strong> {{ order()?.organization?.contactEmail }}</p>
            }
          </div>
        }

        @if (order()?.pickupSlot) {
          <div class="pickup-slot">
            <h2>Pickup Time</h2>
            <p><strong>Start:</strong> {{ order()?.pickupSlot?.slotStartAt | date:'short' }} (local time)</p>
            <p><strong>End:</strong> {{ order()?.pickupSlot?.slotEndAt | date:'short' }} (local time)</p>

            @if (canChangePickupSlot(order()?.orderStatus)) {
              <div class="pickup-slot-change">
                <p class="pickup-slot-help">
                  You can change your pickup slot while this order is still pending or submitted.
                </p>

                @if (pickupSlotNotice()) {
                  <div class="notice notice-success">{{ pickupSlotNotice() }}</div>
                }
                @if (pickupSlotError()) {
                  <div class="notice notice-error">{{ pickupSlotError() }}</div>
                }

                @if (isLoadingPickupSlots()) {
                  <p class="pickup-slot-help">Checking available pickup slots...</p>
                }

                @if (!isLoadingPickupSlots() && hasAlternatePickupSlots()) {
                  <label class="pickup-slot-field">
                    <span>Pickup slot</span>
                    <select [ngModel]="selectedPickupSlotExternalId()"
                            (ngModelChange)="selectedPickupSlotExternalId.set($event)"
                            [disabled]="isChangingPickupSlot()">
                      @for (slot of availablePickupSlots(); track slot) {
                        <option [ngValue]="slot.externalId">
                          {{ formatPickupSlotOption(slot) }}
                        </option>
                      }
                    </select>
                  </label>

                  <button class="btn"
                          type="button"
                          (click)="changePickupSlot()"
                          [disabled]="isChangingPickupSlot() || !canSubmitPickupSlotChange()">
                    {{ isChangingPickupSlot() ? 'Updating...' : 'Change Pickup Slot' }}
                  </button>
                } @else {
                  @if (!isLoadingPickupSlots()) {
                    <p class="pickup-slot-help">No alternate pickup slots are currently available.</p>
                  }
                }
              </div>
            }
          </div>
        }
      </div>
    }

    @if (!order()) {
      <div><p>Order not found.</p></div>
    }
  `,
  styleUrl: './pre-order-detail.scss'
})
export class OrderDetailComponent {

  private route = inject(ActivatedRoute);
  private orders = inject(OrdersService);
  private snackBar = inject(MatSnackBar);

  order = signal<Order | null>(null);
  availablePickupSlots = signal<AvailablePickupSlot[]>([]);
  selectedPickupSlotExternalId = signal('');
  isLoadingPickupSlots = signal(false);
  isChangingPickupSlot = signal(false);
  isCancelling = signal(false);

  cancelNotice = signal('');
  cancelError = signal('');
  pickupSlotNotice = signal('');
  pickupSlotError = signal('');

  externalId = signal(this.getExternalIdFromRoute());

  constructor() {
    effect(() => {
      const id = this.externalId();
      if (!id) return;

      this.orders.getOrderByExternalId(id).subscribe(o => {
        this.order.set(o);
        this.selectedPickupSlotExternalId.set(o.pickupSlot?.externalId ?? '');
        this.loadAvailablePickupSlots();
      });
    });
  }

  private getExternalIdFromRoute(): string {
    return (
      this.route.snapshot.queryParamMap.get('externalId')?.trim() ||
      this.route.snapshot.paramMap.get('externalId')?.trim() ||
      this.route.snapshot.paramMap.get('id')?.trim() ||
      ''
    );
  }

  startAnotherOrder() {
    const eventToken =
      this.order()?.organization?.registrationToken?.trim() ||
      this.route.snapshot.queryParamMap.get('eventToken')?.trim() ||
      this.route.snapshot.queryParamMap.get('org')?.trim() ||
      this.route.snapshot.paramMap.get('eventToken')?.trim() ||
      this.route.snapshot.paramMap.get('org')?.trim() ||
      '';

    window.location.href = eventToken
      ? `/BakeAhead?org=${encodeURIComponent(eventToken)}`
      : '/BakeAhead';
  }

  cancelOrder() {
    if (!this.order() || this.isCancelling()) return;

    if (!confirm('Are you sure you want to cancel this order?')) return;

    if (!this.canCancel(this.order()!.orderStatus)) {
      this.cancelError.set(`Order cannot be cancelled from status '${this.order()!.orderStatus}'.`);
      this.cancelNotice.set('');
      return;
    }

    this.isCancelling.set(true);
    this.cancelError.set('');
    this.cancelNotice.set('');

    this.orders.cancelOrder(this.order()!.externalId).subscribe({
      next: updatedOrder => {
        this.order.set(updatedOrder);
        this.availablePickupSlots.set([]);
        this.snackBar.open('Order cancelled successfully.', 'Close', { duration: 3000,   panelClass: ['info-snackbar'] });
        this.isCancelling.set(false);
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.cancelError.set(apiMessage || 'Unable to cancel the order right now.');
        this.isCancelling.set(false);
      }
    });
  }

  changePickupSlot() {
    if (!this.order() || this.isChangingPickupSlot() || !this.canSubmitPickupSlotChange()) return;

    this.isChangingPickupSlot.set(true);
    this.pickupSlotError.set('');
    this.pickupSlotNotice.set('');

    this.orders.changePickupSlot(this.order()!.externalId, {
      pickupSlotExternalId: this.selectedPickupSlotExternalId()
    }).subscribe({
      next: updatedOrder => {
        this.order.set(updatedOrder);
        this.selectedPickupSlotExternalId.set(updatedOrder.pickupSlot?.externalId ?? '');
        this.pickupSlotNotice.set('Your pickup slot has been updated.');
        this.isChangingPickupSlot.set(false);
        this.loadAvailablePickupSlots();
        this.snackBar.open('Pickup slot updated successfully.', 'Close', { duration: 3000,   panelClass: ['info-snackbar'] });
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.pickupSlotError.set(apiMessage || 'Unable to change the pickup slot right now.');
        this.isChangingPickupSlot.set(false);
      }
    });
  }

  canCancel(status: string | undefined): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'PENDING' || normalized === 'SUBMITTED';
  }

  canChangePickupSlot(status: string | undefined): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'PENDING' || normalized === 'SUBMITTED';
  }

  canSubmitPickupSlotChange(): boolean {
    return !!this.order() &&
      !!this.selectedPickupSlotExternalId() &&
      this.selectedPickupSlotExternalId() !== (this.order()?.pickupSlot?.externalId ?? '');
  }

  hasAlternatePickupSlots(): boolean {
    const current = this.order()?.pickupSlot?.externalId ?? '';
    return this.availablePickupSlots().some(s => s.externalId !== current);
  }

  formatPickupSlotOption(slot: AvailablePickupSlot): string {
    const start = new Date(slot.slotStartAt);
    const end = new Date(slot.slotEndAt);
    const seatsLeft = Math.max(slot.capacity - slot.reservedCount, 0);
    const isCurrent = slot.externalId === this.order()?.pickupSlot?.externalId;

    return `${start.toLocaleString()} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} | ${seatsLeft} slot${seatsLeft === 1 ? '' : 's'} left${isCurrent ? ' | current' : ''}`;
  }

  private loadAvailablePickupSlots() {
    if (!this.order() || !this.canChangePickupSlot(this.order()!.orderStatus)) {
      this.availablePickupSlots.set([]);
      return;
    }

    const orgToken = this.order()?.organization?.registrationToken?.trim() ?? '';
    const eventId = this.order()?.eventToken?.trim() ?? '';

    if (!orgToken || !eventId) {
      this.availablePickupSlots.set([]);
      return;
    }

    this.isLoadingPickupSlots.set(true);
    this.pickupSlotError.set('');

    this.orders.getAvailablePickupSlots(orgToken, eventId).subscribe({
      next: slots => {
        const current = this.order()?.pickupSlot?.externalId ?? '';
        const filtered = slots.filter(s => s.externalId === current || s.reservedCount < s.capacity);

        this.availablePickupSlots.set(filtered);

        if (!filtered.some(s => s.externalId === this.selectedPickupSlotExternalId())) {
          this.selectedPickupSlotExternalId.set(current || filtered[0]?.externalId || '');
        }

        this.isLoadingPickupSlots.set(false);
      },
      error: error => {
        const apiMessage = (error?.error?.error ?? error?.error?.message ?? '').toString().trim();
        this.pickupSlotError.set(apiMessage || 'Unable to load available pickup slots right now.');
        this.availablePickupSlots.set([]);
        this.isLoadingPickupSlots.set(false);
      }
    });
  }
}
