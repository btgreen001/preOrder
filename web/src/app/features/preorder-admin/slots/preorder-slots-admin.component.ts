import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import {
  PreorderAdminService,
  AdminHolidayEvent,
  AdminPickupSlot,
  SavePickupSlotRequest
} from '../services/preorder-admin.service';

@Component({
  selector: 'app-preorder-slots-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './preorder-slots-admin.component.html',
  styleUrl: './preorder-slots-admin.component.scss'
})
export class PreorderSlotsAdminComponent implements OnInit {
  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly snackBar = inject(MatSnackBar);

  holidayEvents: AdminHolidayEvent[] = [];
  pickupSlots: AdminPickupSlot[] = [];

  selectedHolidayEventExternalId = '';
  editingExternalId: string | null = null;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  form: SavePickupSlotRequest = {
    holidayEventExternalId: '',
    slotStartAt: '',
    slotEndAt: '',
    capacity: 1,
    isActive: true
  };

  get selectedHolidayEvent(): AdminHolidayEvent | undefined {
    return this.holidayEvents.find(event => event.externalId === this.selectedHolidayEventExternalId);
  }

  ngOnInit(): void {
    this.loadHolidayEvents();
  }

  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: events => {
        this.holidayEvents = events;
        if (!this.selectedHolidayEventExternalId && events.length > 0) {
          this.selectedHolidayEventExternalId = events[0].externalId;
          this.form.holidayEventExternalId = events[0].externalId;
        }

        if (this.selectedHolidayEventExternalId) {
          this.loadPickupSlots();
        }
      },
      error: () => {
        this.errorMessage = 'Could not load pre-order events.';
      }
    });
  }

  onEventChange(): void {
    this.form.holidayEventExternalId = this.selectedHolidayEventExternalId;
    this.editingExternalId = null;
    this.loadPickupSlots();
  }

  loadPickupSlots(): void {
    if (!this.selectedHolidayEventExternalId) {
      this.pickupSlots = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.preorderAdminService.getPickupSlots(this.selectedHolidayEventExternalId).subscribe({
      next: slots => {
        this.pickupSlots = slots;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load pickup slots.';
        this.isLoading = false;
      }
    });
  }

  startCreate(): void {
    this.editingExternalId = null;
    this.successMessage = '';
    this.form = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      slotStartAt: '',
      slotEndAt: '',
      capacity: 1,
      isActive: true
    };
  }

  startEdit(slot: AdminPickupSlot): void {
    this.editingExternalId = slot.externalId;
    this.successMessage = '';
    this.form = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      slotStartAt: this.toDateTimeInput(slot.slotStartAt),
      slotEndAt: this.toDateTimeInput(slot.slotEndAt),
      capacity: slot.capacity,
      isActive: slot.isActive
    };
  }

  deletePickupSlot(slot: AdminPickupSlot): void {
    const dateStr = new Date(slot.slotStartAt).toLocaleString();
    const deactivateMessage = `Deactivate timeslot "${dateStr}" (${slot.reservedCount}/${slot.capacity} reserved)? You will not be able to reactivate it. Existing orders will remain assigned to this slot.`
    const deleteMessage = `Delete timeslot "${dateStr}"?`;
    const confirmMsg = slot.reservedCount > 0
      ? deactivateMessage
      : deleteMessage;

    if (!confirm(confirmMsg)) {
      this.snackBar.open('Action cancelled.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const deactivateRequest: SavePickupSlotRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      slotStartAt: slot.slotStartAt,
      slotEndAt: slot.slotEndAt,
      capacity: slot.capacity,
      isActive: false
    };

    this.preorderAdminService.updatePickupSlot(slot.externalId, deactivateRequest).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = slot.reservedCount > 0 ? 'Pickup slot deactivated.' : 'Pickup slot deleted.';
        this.loadPickupSlots();
        this.snackBar.open(this.successMessage, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });

      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, slot.reservedCount > 0 ? 'Could not deactivate pickup slot.' : 'Could not delete pickup slot.');
      }
    });
  }

  savePickupSlot(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.holidayEventExternalId) {
      this.errorMessage = 'Select an event first.';
      return;
    }

    if (!this.form.slotStartAt || this.form.slotStartAt.trim() === '') {
      this.errorMessage = 'Slot start date/time is required.';
      return;
    }

    if (!this.form.slotEndAt || this.form.slotEndAt.trim() === '') {
      this.errorMessage = 'Slot end date/time is required.';
      return;
    }

    if (new Date(this.form.slotEndAt) <= new Date(this.form.slotStartAt)) {
      this.errorMessage = 'Slot end must be after slot start.';
      return;
    }

    if (!this.isSameDay(this.form.slotStartAt, this.form.slotEndAt)) {
      this.errorMessage = 'Slot start and end must be on the same day.';
      return;
    }

    if (!this.isSlotWithinEventPickupWindow(this.form.slotStartAt, this.form.slotEndAt)) {
      this.errorMessage = 'Pickup slot must be fully within the selected event pickup window.';
      return;
    }

    if (this.form.capacity < 1) {
      this.errorMessage = 'Capacity must be at least 1.';
      return;
    }

    this.isSaving = true;

    const request: SavePickupSlotRequest = {
      holidayEventExternalId: this.form.holidayEventExternalId,
      // Keep wall-clock values as entered; do not force UTC conversion in UI.
      slotStartAt: this.form.slotStartAt,
      slotEndAt: this.form.slotEndAt,
      capacity: Number(this.form.capacity),
      isActive: this.form.isActive ?? true
    };

    const save$ = this.editingExternalId
      ? this.preorderAdminService.updatePickupSlot(this.editingExternalId, request)
      : this.preorderAdminService.createPickupSlot(request);

    save$.subscribe({
      next: () => {
        this.isSaving = false;
        const successMessage = this.editingExternalId ? 'Pickup slot updated.' : 'Pickup slot created.';
        this.successMessage = successMessage;
        this.startCreate();
        this.loadPickupSlots();
        this.snackBar.open(successMessage, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, 'Could not save pickup slot.');
      }
    });
  }

  private toDateTimeInput(value: string): string {
    if (!value) {
      return '';
    }

    return value.replace(' ', 'T').slice(0, 16);
  }

  private toLocalDateTimeInput(isoValue: string): string {
    return this.toDateTimeInput(isoValue);
  }

  private isSameDay(a: string, b: string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear()
      && da.getMonth() === db.getMonth()
      && da.getDate() === db.getDate();
  }

  private isSlotWithinEventPickupWindow(slotStartAt: string, slotEndAt: string): boolean {
    const selectedEvent = this.selectedHolidayEvent;
    if (!selectedEvent) {
      return false;
    }

    const slotStart = new Date(slotStartAt);
    const slotEnd = new Date(slotEndAt);
    const eventPickupStart = new Date(selectedEvent.pickupStartDt);
    const eventPickupEnd = new Date(selectedEvent.pickupEndDt);

    return slotStart >= eventPickupStart && slotEnd <= eventPickupEnd;
  }
}
