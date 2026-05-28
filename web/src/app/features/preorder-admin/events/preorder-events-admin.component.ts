import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
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
  autoSyncEnabled = true;
  allDayEnabled = true;

  private closesAtManuallyEdited = false;
  private pickupStartDtManuallyEdited = false;
  private pickupEndDtManuallyEdited = false;

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
    this.startCreate();
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.preorderAdminService.getAllHolidayEvents().subscribe({
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
    this.allDayEnabled = true;
    this.resetAutoSyncTracking(true);
    this.form = {
      name: '',
      description: '',
      opensAt: '',
      closesAt: '',
      pickupStartDt: '',
      pickupEndDt: '',
      isActive: true
    };
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(-4, 0, 0, 0);
    this.form.opensAt = tomorrow.toISOString().slice(0, 16);
    this.form.closesAt = tomorrow.toISOString().slice(0, 16);
    if (this.allDayEnabled) {
      this.applyAllDayTimes();
    }

  }

  onAllDayToggle(enabled: boolean): void {
    this.allDayEnabled = enabled;
    if (enabled) {
      this.applyAllDayTimes();
      if (this.autoSyncEnabled) {
        this.syncPickup();
      }
    }
  }

  onAutoSyncToggle(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    if (enabled) {
      // Re-arm downstream sync behavior, but do not immediately overwrite
      // already-entered values. Sync happens on the next user date change.
      this.resetAutoSyncTracking(true);
    }
  }

  syncNow(): void {
    this.resetAutoSyncTracking(true);

    if (this.allDayEnabled) {
      this.form.opensAt = this.setTimePart(this.form.opensAt, '00:00');
      this.form.closesAt = this.setTimePart(this.form.opensAt, '23:59');
      this.syncPickup();
      return;
    }

    this.syncClose();
  }

  onOpensAtChanged(): void {
    if (this.allDayEnabled) {
      this.form.opensAt = this.setTimePart(this.form.opensAt, '00:00');
    }

    if (this.autoSyncEnabled) {
      this.syncClose();
    }
  }

  onClosesAtChanged(): void {
    if (this.allDayEnabled) {
      this.form.closesAt = this.setTimePart(this.form.closesAt, '23:59');
    }

    this.closesAtManuallyEdited = true;
    if (this.autoSyncEnabled) {
      this.syncPickup();
    }
  }

  onPickupStartChanged(): void {
    this.pickupStartDtManuallyEdited = true;
    if (this.autoSyncEnabled) {
      this.syncPickupEnd();
    }
  }

  onPickupEndChanged(): void {
    this.pickupEndDtManuallyEdited = true;
  }

  setOpensMidnight(): void {
    const currentOpensAt = this.opensAtInput?.nativeElement?.value || this.form.opensAt;
    this.form.opensAt = this.setTimePart(currentOpensAt, '00:00');
    this.opensAtInput.nativeElement.value = this.form.opensAt;
    this.onOpensAtChanged();
  }

  setClosesEndOfDay(): void {
    const currentClosesAt = this.closesAtInput?.nativeElement?.value || this.form.closesAt;
    this.form.closesAt = this.setTimePart(currentClosesAt, '23:59');
    this.closesAtInput.nativeElement.value = this.form.closesAt;
    this.onClosesAtChanged();
  }

  syncClose() {
    // If opensAt is empty, do nothing
    if (!this.form.opensAt) return;

    if (!this.closesAtManuallyEdited && !this.autoSyncEnabled) {
      this.form.closesAt = this.allDayEnabled
        ? this.setTimePart(this.form.opensAt, '23:59')
        : this.form.opensAt;
    }
    if (this.autoSyncEnabled){
      this.form.closesAt = this.allDayEnabled
        ? this.setTimePart(this.form.opensAt, '23:59')
        : this.form.opensAt;
      this.syncPickup();
    }

    this.syncPickup();

  }

  syncPickup() {
    // If closesAt is empty, do nothing
    if (!this.form.closesAt) return;

    const pickupDate = this.form.closesAt?.split('T')[0] ?? '';

    if (!this.pickupStartDtManuallyEdited) {
      this.form.pickupStartDt = pickupDate;
    }

    if (!this.pickupEndDtManuallyEdited) {
      this.form.pickupEndDt = pickupDate;
    }

  }

  syncPickupEnd() {
    // If pickupStartDt is empty, do nothing
    if (!this.form.pickupStartDt) return;

    if (!this.pickupEndDtManuallyEdited) {
      this.form.pickupEndDt = this.form.pickupStartDt;
    }

  }

  canEditEvent(event: AdminHolidayEvent): boolean {
    if (!event.opensAt) {
      return false;
    }

    const opensAt = new Date(event.opensAt);
    if (Number.isNaN(opensAt.getTime())) {
      return false;
    }

    return opensAt.getTime() > Date.now();
  }

  startEdit(event: AdminHolidayEvent): void {
    this.editingExternalId = event.externalId;
    this.successMessage = '';
    this.allDayEnabled = false;
    this.resetAutoSyncTracking(false);
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

  activateToggleEvent(event: AdminHolidayEvent): void {
    const action = event.isActive ? 'deactivate' : 'activate';
    const deactivateMessage = `Deactivating ${event.name} will hide it from customers and prevent new pre-orders, but existing pre-orders will not be affected.`;
    const activateMessage = `Activating ${event.name} will make it visible to customers and allow new pre-orders.`;
    if (!confirm(event.isActive ? deactivateMessage : activateMessage)) {
      this.snackBar.open('Action cancelled.', 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      return;
    }

    const request: SaveHolidayEventRequest = {
      name: event.name,
      description: event.description,
      opensAt: event.opensAt,
      closesAt: event.closesAt,
      pickupStartDt: event.pickupStartDt,
      pickupEndDt: event.pickupEndDt,
      isActive: !event.isActive
    };

    this.isSaving = true;
    this.errorMessage = '';

    this.preorderAdminService.updateHolidayEvent(event.externalId, request).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadEvents();
        this.snackBar.open(`Event ${action}d.`, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = extractErrorMessage(error, `Could not ${action} event.`);
      }
    });
  }


  saveEvent(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate all required fields
    if (!this.form.name || !this.form.name.trim()) {
      this.snackBar.open('Event name is required.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      this.focusValidationField(this.nameInput);
      return;
    }

    if (!this.form.opensAt || this.form.opensAt.trim() === '') {
      this.snackBar.open('Event Open date/time is required.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      this.focusValidationField(this.opensAtInput);
      return;
    }

    if (!this.form.closesAt || this.form.closesAt.trim() === '') {
      this.snackBar.open('Event Close date/time is required.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      this.focusValidationField(this.closesAtInput);
      return;
    }

    if (!this.form.pickupStartDt || this.form.pickupStartDt.trim() === '') {
      this.snackBar.open('Pickup start date is required.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      this.focusValidationField(this.pickupStartDtInput);
      return;
    }

    if (!this.form.pickupEndDt || this.form.pickupEndDt.trim() === '') {
      this.snackBar.open('Pickup end date is required.', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      this.focusValidationField(this.pickupEndDtInput);
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
        const successMessage = this.editingExternalId ? 'Event updated.' : 'Event created.';
        this.successMessage = successMessage;
        this.snackBar.open(successMessage, 'Close', { duration: 3000 , panelClass: ['info-snackbar'] });
        this.startCreate();
        this.loadEvents();
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

  private applyAllDayTimes(): void {
    this.form.opensAt = this.setTimePart(this.form.opensAt, '00:00');
    this.form.closesAt = this.setTimePart(this.form.closesAt, '23:59');
  }

  private setTimePart(value: string, time: string): string {
    if (!value) {
      return value;
    }

    const normalizedValue = value.replace(' ', 'T');
    const datePart = normalizedValue.split('T')[0] ?? '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return `${datePart}T${time}`;
    }

    const usDatePart = this.toIsoDateFromUsDate(datePart);
    if (usDatePart) {
      return `${usDatePart}T${time}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${this.toLocalDatePart(parsed)}T${time}`;
    }

    return value;
  }

  private toLocalDatePart(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toIsoDateFromUsDate(value: string): string | null {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
      return null;
    }

    const [, monthRaw, dayRaw, year] = match;
    const month = monthRaw.padStart(2, '0');
    const day = dayRaw.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resetAutoSyncTracking(autoSyncEnabled: boolean): void {
    this.autoSyncEnabled = autoSyncEnabled;
    this.closesAtManuallyEdited = false;
    this.pickupStartDtManuallyEdited = false;
    this.pickupEndDtManuallyEdited = false;
  }

  private focusValidationField(inputRef: ElementRef<HTMLInputElement>): void {
    const input = inputRef?.nativeElement;
    if (!input) {
      return;
    }

    if (this.isMobileViewport()) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    input.focus();
  }

  private isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 768px)').matches;
  }

@ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
@ViewChild('opensAtInput') opensAtInput!: ElementRef<HTMLInputElement>;
@ViewChild('closesAtInput') closesAtInput!: ElementRef<HTMLInputElement>;
@ViewChild('pickupStartDtInput') pickupStartDtInput!: ElementRef<HTMLInputElement>;
@ViewChild('pickupEndDtInput') pickupEndDtInput!: ElementRef<HTMLInputElement>;

}