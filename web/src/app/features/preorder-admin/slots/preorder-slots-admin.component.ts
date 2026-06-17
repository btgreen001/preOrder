import { Component, ElementRef, OnInit, ViewChild, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import { take } from 'rxjs/operators';
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
  private initialized = false;


  // SIGNAL STATE
  holidayEvents = signal<AdminHolidayEvent[]>([]);
  pickupSlots = signal<AdminPickupSlot[]>([]);

  selectedHolidayEventExternalId = signal('');
  editingExternalId = signal<string | null>(null);

  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  form = signal<SavePickupSlotRequest>({
    holidayEventExternalId: '',
    slotStartAt: '',
    slotEndAt: '',
    capacity: 1,
    isActive: true
  });

  // COMPUTED
  selectedHolidayEvent = computed(() =>
    this.holidayEvents().find(e => e.externalId === this.selectedHolidayEventExternalId())
  );

  ngOnInit(): void {
    this.loadHolidayEvents();
  }


  // LOAD EVENTS
  loadHolidayEvents(): void {
    this.preorderAdminService.getAllHolidayEvents()
      .pipe(take(1))
      .subscribe({
        next: events => {
          this.holidayEvents.set(events);

          const persisted = this.preorderAdminService.getSelectedHolidayEventExternalId();
          const chosen = persisted || events[0]?.externalId || '';

          // Initialize selected event and immediately load matching slots.
          if (!this.selectedHolidayEventExternalId() && chosen) {
            this.onEventChange(chosen);
          }
        },
        error: () => {
          this.errorMessage.set('Could not load pre-order events.');
        }
      });
  }



  onEventChange(selectedId?: string): void {
    const id = selectedId ?? this.selectedHolidayEventExternalId();
    const isInitial = !this.initialized;

    this.selectedHolidayEventExternalId.set(id);
    this.preorderAdminService.setSelectedHolidayEventExternalId(id);

    this.form.update(f => ({ ...f, holidayEventExternalId: id }));
    this.editingExternalId.set(null);
    this.successMessage.set('');

    this.loadPickupSlots();

    // Only show snackbar if NOT initial load
    if (!isInitial) {
      this.snackBar.open('Event changed. Pickup slots reloaded.', 'Close', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
    }

    this.initialized = true;
  }



  // LOAD SLOTS
  loadPickupSlots(): void {
    const eventId = this.selectedHolidayEventExternalId();
    if (!eventId) {
      this.pickupSlots.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.getPickupSlots(eventId).subscribe({
      next: slots => {
        this.pickupSlots.set(slots);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load pickup slots.');
        this.isLoading.set(false);
      }
    });
  }

  // CREATE
  startCreate(): void {
    this.editingExternalId.set(null);
    this.successMessage.set('');

    this.form.set({
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      slotStartAt: '',
      slotEndAt: '',
      capacity: 1,
      isActive: true
    });
  }

  // EDIT
  startEdit(slot: AdminPickupSlot): void {
    this.editingExternalId.set(slot.externalId);
    this.successMessage.set('');

    this.form.set({
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      slotStartAt: this.toDateTimeInput(slot.slotStartAt),
      slotEndAt: this.toDateTimeInput(slot.slotEndAt),
      capacity: slot.capacity,
      isActive: slot.isActive
    });

    this.scrollToEditorStart();
  }

  // DELETE / DEACTIVATE
  deletePickupSlot(slot: AdminPickupSlot): void {
    const dateStr = new Date(slot.slotStartAt).toLocaleString();
    const deactivateMessage = `Deactivate timeslot "${dateStr}" (${slot.reservedCount}/${slot.capacity} reserved)? You will not be able to reactivate it. Existing orders will remain assigned to this slot.`;
    const deleteMessage = `Delete timeslot "${dateStr}"?`;

    const confirmMsg = slot.reservedCount > 0 ? deactivateMessage : deleteMessage;

    if (!confirm(confirmMsg)) {
      this.snackBar.open('Action cancelled.', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const deactivateRequest: SavePickupSlotRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      slotStartAt: slot.slotStartAt,
      slotEndAt: slot.slotEndAt,
      capacity: slot.capacity,
      isActive: false
    };

    this.preorderAdminService.updatePickupSlot(slot.externalId, deactivateRequest).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set(slot.reservedCount > 0 ? 'Pickup slot deactivated.' : 'Pickup slot deleted.');
        this.loadPickupSlots();
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set(
          extractErrorMessage(err, slot.reservedCount > 0 ? 'Could not deactivate pickup slot.' : 'Could not delete pickup slot.')
        );
      }
    });
  }


savePickupSlot(): void {
  this.errorMessage.set('');
  this.successMessage.set('');

  const form = this.form();

  // VALIDATION
  if (!form.holidayEventExternalId) {
    const msg = 'Select an event first.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (!form.slotStartAt || form.slotStartAt.trim() === '') {
    const msg = 'Slot start date/time is required.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (!form.slotEndAt || form.slotEndAt.trim() === '') {
    const msg = 'Slot end date/time is required.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (new Date(form.slotEndAt) <= new Date(form.slotStartAt)) {
    const msg = 'Slot end must be after slot start.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (!this.isSameDay(form.slotStartAt, form.slotEndAt)) {
    const msg = 'Slot start and end must be on the same day.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (!this.isSlotWithinEventPickupWindow(form.slotStartAt, form.slotEndAt)) {
    const msg = 'Pickup slot must be fully within the selected event pickup window.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  if (form.capacity < 1) {
    const msg = 'Capacity must be at least 1.';
    this.errorMessage.set(msg);
    this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    return;
  }

  // SAVE
  this.isSaving.set(true);

  const request: SavePickupSlotRequest = {
    holidayEventExternalId: form.holidayEventExternalId,
    slotStartAt: form.slotStartAt,
    slotEndAt: form.slotEndAt,
    capacity: Number(form.capacity),
    isActive: form.isActive ?? true
  };

  const editingId = this.editingExternalId();
  const save$ = editingId
    ? this.preorderAdminService.updatePickupSlot(editingId, request)
    : this.preorderAdminService.createPickupSlot(request);

  save$.subscribe({
    next: () => {
      this.isSaving.set(false);

      const msg = editingId ? 'Pickup slot updated.' : 'Pickup slot created.';
      this.successMessage.set(msg);

      this.startCreate();
      this.loadPickupSlots();

      this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
    },
    error: (error) => {
      this.isSaving.set(false);
      const msg = extractErrorMessage(error, 'Could not save pickup slot.');
      this.errorMessage.set(msg);
      this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['info-snackbar'] });
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

  private scrollToEditorStart(): void {
    const input = this.slotPickupHeader?.nativeElement;
    if (!input) {
      return;
    }

    setTimeout(() => {
      const scrollContainer = document.querySelector('.content-scroll') as HTMLElement | null;

      if (scrollContainer) {
        const inputRect = input.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetTop = scrollContainer.scrollTop + inputRect.top - containerRect.top - 24;

        scrollContainer.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth'
        });
      } else {
        input.scrollIntoView({
          behavior: 'smooth',
          block: this.isMobileViewport() ? 'center' : 'start',
          inline: 'nearest'
        });
      }

      if (!this.isMobileViewport()) {
        setTimeout(() => input.focus(), 220);
      }
    });
  }

  private isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(max-width: 768px)').matches;
  }

  private isSameDay(a: string, b: string): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear()
      && da.getMonth() === db.getMonth()
      && da.getDate() === db.getDate();
  }

  private isSlotWithinEventPickupWindow(slotStartAt: string, slotEndAt: string): boolean {
    const selectedEvent = this.selectedHolidayEvent();
    if (!selectedEvent) return false;

    const slotStart = new Date(slotStartAt);
    const slotEnd = new Date(slotEndAt);
    const eventPickupStart = new Date(selectedEvent.pickupStartDt);
    const eventPickupEnd = new Date(selectedEvent.pickupEndDt);

    return slotStart >= eventPickupStart && slotEnd <= eventPickupEnd;
  }


  @ViewChild('slotStartAtInput') slotStartAtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('slotEndAtInput') slotEndAtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('slotPickupHeader') slotPickupHeader!: ElementRef<HTMLElement>;

}
