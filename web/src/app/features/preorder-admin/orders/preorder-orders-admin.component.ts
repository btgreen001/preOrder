import { Component, OnInit, inject } from '@angular/core';
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
export class PreorderOrdersAdminComponent implements OnInit {
  private readonly preorderAdminService = inject(PreorderAdminService);

  holidayEvents: AdminHolidayEvent[] = [];
  preOrders: AdminPreOrder[] = [];
  selectedHolidayEventExternalId = '';
  selectedPickupDateLocal = '';

  isLoading = false;
  isExporting = false;
  errorMessage = '';
  savingStatusByOrderExternalId: Record<string, boolean> = {};
  pendingStatusByOrderExternalId: Record<string, string> = {};

  ngOnInit(): void {
    this.loadHolidayEvents();
    this.loadPreOrders();
  }

  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: (events) => {
        this.holidayEvents = events;
      },
      error: () => {
        this.errorMessage = 'Could not load pre-order events.';
      }
    });
  }

  loadPreOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.preorderAdminService.getPreOrders(this.selectedHolidayEventExternalId || undefined).subscribe({
      next: (orders) => {
        this.preOrders = orders;
        this.pendingStatusByOrderExternalId = {};
        this.preOrders.forEach(order => {
          this.pendingStatusByOrderExternalId[order.externalId] = order.status;
        });
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load preorder operations data.';
        this.isLoading = false;
      }
    });
  }

  exportCsv(): void {
    this.isExporting = true;
    this.errorMessage = '';

    this.preorderAdminService
      .exportPreOrdersCsv(this.selectedHolidayEventExternalId || undefined, this.selectedPickupDateLocal || undefined)
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = `preorders-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
          anchor.click();
          URL.revokeObjectURL(objectUrl);
          this.isExporting = false;
        },
        error: () => {
          this.errorMessage = 'CSV export failed.';
          this.isExporting = false;
        }
      });
  }

  get filteredPreOrders(): AdminPreOrder[] {
    if (!this.selectedPickupDateLocal) {
      return this.preOrders;
    }
    return this.preOrders.filter(order => {
      const slotDate = order.pickupSlot?.slotStartAt;
      if (!slotDate) return false;
      return slotDate.startsWith(this.selectedPickupDateLocal);
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  getHolidayEventName(holidayEventId: number): string {
    return this.holidayEvents.find(event => event.id === holidayEventId)?.name ?? 'Unknown event';
  }

  hasOrdersFor(holidayEventId: number): boolean {
    return !!this.preOrders.find(order => order.holidayEventId === holidayEventId);
  }

  getAllowedNextStatuses(currentStatus: string): string[] {
    const normalizedCurrent = currentStatus.trim().toUpperCase();

    switch (normalizedCurrent) {
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
    const targetStatus = this.pendingStatusByOrderExternalId[order.externalId] ?? order.status;
    return !!targetStatus
      && targetStatus.trim().toUpperCase() !== order.status.trim().toUpperCase()
      && this.getAllowedNextStatuses(order.status).includes(targetStatus.trim().toUpperCase());
  }

  updateOrderStatus(order: AdminPreOrder): void {
    const targetStatus = this.pendingStatusByOrderExternalId[order.externalId];
    if (!targetStatus || !this.canUpdateStatus(order)) {
      return;
    }

    this.savingStatusByOrderExternalId[order.externalId] = true;
    this.errorMessage = '';

    this.preorderAdminService.updatePreOrderStatus(order.externalId, { status: targetStatus }).subscribe({
      next: (response) => {
        order.status = response.status;
        this.pendingStatusByOrderExternalId[order.externalId] = response.status;
        this.savingStatusByOrderExternalId[order.externalId] = false;
      },
      error: (error) => {
        this.pendingStatusByOrderExternalId[order.externalId] = order.status;
        this.savingStatusByOrderExternalId[order.externalId] = false;
        this.errorMessage = extractErrorMessage(error, 'Could not update order status.');
      }
    });
  }

}
