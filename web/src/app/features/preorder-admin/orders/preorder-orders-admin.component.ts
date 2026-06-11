import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import { PreorderAdminService, AdminHolidayEvent, AdminPreOrder } from '../services/preorder-admin.service';
import { untracked } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OverrideStatusDialogComponent } from './override-status-dialog.component';


@Component({
  selector: 'app-preorder-orders-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule ],
  templateUrl: './preorder-orders-admin.component.html',
  styleUrl: './preorder-orders-admin.component.scss'
})
export class PreorderOrdersAdminComponent {
  private readonly preorderAdminService = inject(PreorderAdminService);

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').trim().toUpperCase();
  }

  private ensurePendingStatusSignal(orderId: string): ReturnType<typeof signal<string>> {
    let statusSignal = this.pendingStatusByOrderExternalId.get(orderId);
    if (!statusSignal) {
      statusSignal = signal('');
      this.pendingStatusByOrderExternalId.set(orderId, statusSignal);
    }
    return statusSignal;
  }

  private getEffectiveStatus(order: AdminPreOrder): string {
    const pendingSignal = this.pendingStatusByOrderExternalId.get(order.externalId);
    const pending = pendingSignal ? pendingSignal() : undefined;
    const normalizedPending = this.normalizeStatus(pending);
    if (normalizedPending) {
      return normalizedPending;
    }

    return this.normalizeStatus(order.status);
  }

  // --- Signals ---
  holidayEvents = signal<AdminHolidayEvent[]>([]);
  preOrders = signal<AdminPreOrder[]>([]);
  allPreOrders = signal<AdminPreOrder[]>([]);

  selectedHolidayEventExternalId = signal<string>('');
  selectedPickupDateLocal = signal<string>('');

  isLoading = signal(false);
  isExporting = signal(false);
  errorMessage = signal('');
  eventsLoaded = signal(false);

  pendingStatusByOrderExternalId = new Map<string, ReturnType<typeof signal<string>>>();
  savingStatusByOrderExternalId = signal<Record<string, boolean>>({});

  private dialog = inject(MatDialog);
  
  constructor(private snackBar: MatSnackBar) {
  }
  
  initializeStatuses(orders: AdminPreOrder[]) {
    for (const order of orders) {
      this.pendingStatusByOrderExternalId.set(
        order.externalId,
        signal(this.normalizeStatus(order.status))
      );
    }
  }

  ngOnInit() {
    this.loadHolidayEvents();

  }


  loadHolidayEvents(): void {
      this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: events => {
        this.holidayEvents.set(events);

        // Default to ALL EVENTS
        this.selectedHolidayEventExternalId.set('');

        // Load ALL orders once
        this.preorderAdminService.getPreOrders(undefined).subscribe({
          next: allOrders => {
             this.allPreOrders.set(allOrders);

            // Also show all orders initially
            this.preOrders.set(allOrders);
            // --- Initialize pending map immediately so template finds keys on first render ---
            for (const o of allOrders) {
              this.pendingStatusByOrderExternalId.set(
                String(o.externalId ?? ''),
                signal(this.normalizeStatus(o.status))
              );
            }
          },
          error: () => this.errorMessage.set('Could not load preorder operations data.')
        });


      },
      error: () => this.errorMessage.set('Could not load pre-order events.')
    });
  }


  onEventChange(value: string) {
    this.selectedHolidayEventExternalId.set(value);
    this.loadPreOrders(value || undefined);
  }


  // --- Load preorders ---
  loadPreOrders(eventId?: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.getPreOrders(eventId || undefined).subscribe({
      next: orders => {
        this.preOrders.set(orders);

        const pending: Record<string, string> = {};
        for (const o of orders) {
          pending[o.externalId] = this.normalizeStatus(o.status);
        }
        // inside loadPreOrders next: orders => { ... }
        for (const o of orders) {
          this.pendingStatusByOrderExternalId.set(
            String(o.externalId ?? ''),
            signal(this.normalizeStatus(o.status))
          );
        }

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


  eventsWithOrders = computed(() => {
    const events = this.holidayEvents();
    const allOrders = this.allPreOrders();

    const eventIdsWithOrders = new Set(allOrders.map(o => o.holidayEventId));
    return events.filter(e => eventIdsWithOrders.has(e.id));
  });


  getAllowedNextStatuses(currentStatus: string | null | undefined): string[] {
    const s = this.normalizeStatus(currentStatus);
    if (!s) return [];

    switch (s) {
      case 'PENDING':
        return ['SUBMITTED'];
      case 'SUBMITTED':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['DELIVERED', 'CANCELLED'];
      default:
        return [];
    }
  }


  getStatusOptions(order: AdminPreOrder): string[] {
    const current = this.normalizeStatus(order.status); // ignore pending

    if (!current) return [];

    // Recompute next statuses based on the *actual* current status
    const next = this.getAllowedNextStatuses(current);

    // If no next statuses, only show the current one
    if (next.length === 0) {
      return [current];
    }

    // Otherwise show current + valid next statuses
    return [current, ...next];
  }

  canUpdateStatus(order: AdminPreOrder): boolean {
    const pendingSignal = this.pendingStatusByOrderExternalId.get(order.externalId);
    const pending = pendingSignal ? pendingSignal() : undefined;

    const target = pending ?? order.status;
    const current = this.normalizeStatus(order.status);
    const normalizedTarget = this.normalizeStatus(target);

    return !!normalizedTarget &&
          !!current &&
          normalizedTarget !== current &&
          this.getAllowedNextStatuses(current).includes(normalizedTarget);
  }


  updateOrderStatus(order: AdminPreOrder): void {
    const pendingSignal = this.ensurePendingStatusSignal(order.externalId);
    const pending = pendingSignal ? pendingSignal() : undefined;
    const normalizedPending = this.normalizeStatus(pending);

    if (!normalizedPending || !this.canUpdateStatus(order)) return;

    this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: true }));
    this.errorMessage.set('');

    this.preorderAdminService.updatePreOrderStatus(order.externalId, { status: normalizedPending }).subscribe({
      next: response => {
        // update order in list
        this.preOrders.update(list =>
          list.map(o => o.externalId === order.externalId ? { ...o, status: response.status } : o)
        );

        // update pending signal
        pendingSignal.set(this.normalizeStatus(response.status));

        this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: false }));
        this.snackBar.open(`Order status updated to ${response.status}.`, 'Close', {
          duration: 3000,
          panelClass: ['info-snackbar']
        });
      },
      error: err => {
        // revert pending to actual order status
        pendingSignal.set(this.normalizeStatus(order.status));

        this.savingStatusByOrderExternalId.update(map => ({ ...map, [order.externalId]: false }));
        this.errorMessage.set(extractErrorMessage(err, 'Could not update order status.'));
      }
    });
  }


  openOverrideDialog(order: AdminPreOrder) {
    const dialog = this.dialog.open(OverrideStatusDialogComponent, {
      width: '400px',
      panelClass: 'override-dialog-panel',
      data: {
        currentStatus: this.normalizeStatus(order.status)
      }
    });


    dialog.afterClosed().subscribe(result => {
      if (!result) return; // user cancelled

      const { status, reason } = result;

      this.overrideOrderStatus(order, status, reason);
    });
  }


  overrideOrderStatus(order: AdminPreOrder, newStatus: string, reason: string) {
    this.savingStatusByOrderExternalId.update(m => ({ ...m, [order.externalId]: true }));
    this.errorMessage.set('');

    this.preorderAdminService.overridePreOrderStatus(order.externalId, {
      status: newStatus,
      reason
    }).subscribe({
      next: response => {
        const responseStatus = (response as { status?: string; orderStatus?: string });
        const resolvedStatus = this.normalizeStatus(
          responseStatus.status ?? responseStatus.orderStatus ?? newStatus ?? order.status
        );

        this.preOrders.update(list =>
          list.map(o => o.externalId === order.externalId ? { ...o, status: resolvedStatus } : o)
        );

        this.ensurePendingStatusSignal(order.externalId).set(resolvedStatus);
        this.savingStatusByOrderExternalId.update(m => ({ ...m, [order.externalId]: false }));
      },
      error: err => {
        this.savingStatusByOrderExternalId.update(m => ({ ...m, [order.externalId]: false }));
        this.errorMessage.set('Override failed: ' + extractErrorMessage(err));
      }
    });
  }


  updatePendingStatus(id: string, status: string) {
    this.ensurePendingStatusSignal(id).set(this.normalizeStatus(status));
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
