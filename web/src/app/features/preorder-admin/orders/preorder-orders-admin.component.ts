import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import { PreorderAdminService, AdminHolidayEvent, AdminPreOrder } from '../services/preorder-admin.service';

@Component({
  selector: 'app-preorder-orders-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './preorder-orders-admin.component.html',
  styleUrl: './preorder-orders-admin.component.scss'
})
export class PreorderOrdersAdminComponent {
  private readonly preorderAdminService = inject(PreorderAdminService);

  // --- Signals ---
  holidayEvents = signal<AdminHolidayEvent[]>([]);
  preOrders = signal<AdminPreOrder[]>([]);

  selectedHolidayEventExternalId = signal<string>('');
  selectedPickupDateLocal = signal<string>('');

  isLoading = signal(false);
  isExporting = signal(false);
  errorMessage = signal('');

  pendingStatusByOrderExternalId = signal<Record<string, string>>({});
  savingStatusByOrderExternalId = signal<Record<string, boolean>>({});

  constructor() {
    // Load events once
    this.loadHolidayEvents();

    // Auto-load preorders whenever filters change
    effect(() => {
      const eventId = this.selectedHolidayEventExternalId();
      this.loadPreOrders(eventId);
    });
  }

  // --- Load events ---
  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: events => this.holidayEvents.set(events),
      error: () => this.errorMessage.set('Could not load pre-order events.')
    });
  }

  // --- Load preorders ---
  loadPreOrders(eventId?: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.getPreOrders(eventId || undefined).subscribe({
      next: orders => {
        this.preOrders.set(orders);

        const pending: Record<string, string> = {};
        orders.forEach(o => pending[o.externalId] = o.status);
        this.pendingStatusByOrderExternalId.set(pending);

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load preorder operations data.');
        this.isLoading.set(false);
      }
    });
  }

  // --- Computed filtered orders ---
  filteredPreOrders = computed(() => {
    const date = this.selectedPickupDateLocal();
    const orders = this.preOrders();

    if (!date) return orders;

    return orders.filter(order => {
      const slotDate = order.pickupSlot?.slotStartAt;
      return slotDate?.startsWith(date);
    });
  });

  // --- Helpers ---
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  getHolidayEventName = (id: number): string =>
    this.holidayEvents().find(e => e.id === id)?.name ?? 'Unknown event';

  hasOrdersFor = (id: number): boolean =>
    this.preOrders().some(o => o.holidayEventId === id);

  getAllowedNextStatuses(currentStatus: string): string[] {
    const s = currentStatus.trim().toUpperCase();
    switch (s) {
      case 'SUBMITTED':
      case 'PENDING':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['DELIVERED', 'CANCELLED'];
      default:
        return [];
    }
  }

  canUpdateStatus(order: AdminPreOrder): boolean {
    const pending = this.pendingStatusByOrderExternalId()[order.externalId];
    const target = pending ?? order.status;

    return !!target &&
      target.trim().toUpperCase() !== order.status.trim().toUpperCase() &&
      this.getAllowedNextStatuses(order.status).includes(target.trim().toUpperCase());
  }

  // --- Update status ---
  updateOrderStatus(order: AdminPreOrder): void {
    const pending = this.pendingStatusByOrderExternalId()[order.externalId];
    if (!pending || !this.canUpdateStatus(order)) return;

    this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: true }));
    this.errorMessage.set('');

    this.preorderAdminService.updatePreOrderStatus(order.externalId, { status: pending }).subscribe({
      next: response => {
        // update order in list
        this.preOrders.update(list =>
          list.map(o => o.externalId === order.externalId ? { ...o, status: response.status } : o)
        );

        // update pending
        this.pendingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: response.status }));
        this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: false }));
      },
      error: err => {
        this.pendingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: order.status }));
        this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: false }));
        this.errorMessage.set(extractErrorMessage(err, 'Could not update order status.'));
      }
    });
  }

  // --- Export CSV ---
  exportCsv(): void {
    this.isExporting.set(true);
    this.errorMessage.set('');

    this.preorderAdminService
      .exportPreOrdersCsv(
        this.selectedHolidayEventExternalId() || undefined,
        this.selectedPickupDateLocal() || undefined
      )
      .subscribe({
        next: blob => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = `preorders-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
          anchor.click();
          URL.revokeObjectURL(objectUrl);
          this.isExporting.set(false);
        },
        error: () => {
          this.errorMessage.set('CSV export failed.');
          this.isExporting.set(false);
        }
      });
  }
}
