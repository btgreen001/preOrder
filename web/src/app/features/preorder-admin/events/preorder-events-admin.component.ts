import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import { PreorderAdminService, AdminHolidayEvent, SaveHolidayEventRequest } from '../services/preorder-admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-preorder-events-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './preorder-events-admin.component.html',
  styleUrl: './preorder-events-admin.component.scss'
})
export class PreorderEventsAdminComponent implements OnInit {
  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly snackBar = inject(MatSnackBar);
  
  events: AdminHolidayEvent[] = [];
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  editingExternalId: string | null = null;

  form: SaveHolidayEventRequest = {
    name: '',
    description: '',
    opensAt: '',
    closesAt: '',
    pickupStartDt: '',
    pickupEndDt: '',
    isActive: true
  };

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.preorderAdminService.getHolidayEvents().subscribe({
      next: events => {
        this.events = events;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load pre-order events.';
        this.isLoading = false;
      }
    });
  }

  startCreate(): void {
    this.editingExternalId = null;
    this.successMessage = '';
    this.form = {
      name: '',
      description: '',
      opensAt: '',
      closesAt: '',
      pickupStartDt: '',
      pickupEndDt: '',
      isActive: true
    };
  }

  startEdit(event: AdminHolidayEvent): void {
    this.editingExternalId = event.externalId;
    this.successMessage = '';
    this.form = {
      name: event.name,
      description: event.description ?? '',
      opensAt: this.toDateTimeInput(event.opensAt),
      closesAt: this.toDateTimeInput(event.closesAt),
      pickupStartDt: this.toDateInput(event.pickupStartDt),
      pickupEndDt: this.toDateInput(event.pickupEndDt),
      isActive: event.isActive
    };
  }

  deleteEvent(event: AdminHolidayEvent): void {
    const confirmMsg = event.isActive
      ? `Deactivate "${event.name}"? This will prevent new orders but won't delete existing preorders.`
      : `Permanently deactivated "${event.name}" - reactivate it to accept new orders.`;

    if (!confirm(confirmMsg)) {
      this.snackBar.open('Event Deleted', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const deactivateRequest: SaveHolidayEventRequest = {
      name: event.name,
      description: event.description,
      opensAt: event.opensAt,
      closesAt: event.closesAt,
      pickupStartDt: event.pickupStartDt,
      pickupEndDt: event.pickupEndDt,
      isActive: false
    };

    this.preorderAdminService.updateHolidayEvent(event.externalId, deactivateRequest).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Event deactivated.';
        this.loadEvents();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not deactivate event.');
      }
    });
  }

  saveEvent(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate all required fields
    if (!this.form.name || !this.form.name.trim()) {
      this.errorMessage = 'Event name is required.';
      return;
    }

    if (!this.form.opensAt || this.form.opensAt.trim() === '') {
      this.errorMessage = 'Opens date/time is required.';
      return;
    }

    if (!this.form.closesAt || this.form.closesAt.trim() === '') {
      this.errorMessage = 'Closes date/time is required.';
      return;
    }

    if (!this.form.pickupStartDt || this.form.pickupStartDt.trim() === '') {
      this.errorMessage = 'Pickup start date is required.';
      return;
    }

    if (!this.form.pickupEndDt || this.form.pickupEndDt.trim() === '') {
      this.errorMessage = 'Pickup end date is required.';
      return;
    }

    this.isSaving = true;

    const request: SaveHolidayEventRequest = {
      name: this.form.name.trim(),
      description: this.form.description?.trim() || undefined,
      // Keep wall-clock values as entered; do not force UTC conversion in UI.
      opensAt: this.form.opensAt,
      closesAt: this.form.closesAt,
      pickupStartDt: this.form.pickupStartDt,
      pickupEndDt: this.form.pickupEndDt,
      isActive: this.form.isActive ?? true
    };

    const save$ = this.editingExternalId
      ? this.preorderAdminService.updateHolidayEvent(this.editingExternalId, request)
      : this.preorderAdminService.createHolidayEvent(request);

    save$.subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = this.editingExternalId ? 'Event updated.' : 'Event created.';
        this.startCreate();
        this.loadEvents();
        this.snackBar.open(this.successMessage, 'Close', { duration: 3000 });
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not save pre-order event.');
      }
    });
  }

  private toDateTimeInput(value: string): string {
    if (!value) {
      return '';
    }

    return value.replace(' ', 'T').slice(0, 16);
  }

  private toDateInput(value: string): string {
    if (!value) {
      return '';
    }

    return value.slice(0, 10);
  }

  private toLocalDateTimeInput(isoValue: string): string {
    return this.toDateTimeInput(isoValue);
  }

  private toLocalDateInput(isoValue: string): string {
    return this.toDateInput(isoValue);
  }
}
