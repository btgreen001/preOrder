import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  selectedPickupDateUtc = '';

  isLoading = false;
  isExporting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadHolidayEvents();
    this.loadPreOrders();
  }

  loadHolidayEvents(): void {
    this.preorderAdminService.getHolidayEvents().subscribe({
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
      .exportPreOrdersCsv(this.selectedHolidayEventExternalId || undefined, this.selectedPickupDateUtc || undefined)
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

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}
