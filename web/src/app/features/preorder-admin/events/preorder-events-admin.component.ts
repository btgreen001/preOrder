import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import {
  PreorderAdminService,
  AdminHolidayEvent,
  SaveHolidayEventRequest,
} from '../services/preorder-admin.service';
import { extractErrorMessage } from '../../../shared/utils/error-extractor';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-preorder-events-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './preorder-events-admin.component.html',
  styleUrl: './preorder-events-admin.component.scss',
})
export class PreorderEventsAdminComponent implements OnInit, OnDestroy {
  private static readonly FORCE_TOUR_KEY = 'preorder.forceTour';
  private static readonly FORCE_TOUR_DEBUG_KEY = 'preorder.forceTourDebug';
  private static readonly QUICK_TOUR_EVENT = 'preorder:tour:start';
  private static readonly SAVE_CONTINUE_NAV_DELAY_MS = 250;

  private readonly preorderAdminService = inject(PreorderAdminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly fb = inject(NonNullableFormBuilder);

  // --- Reactive form ---
  form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    opensAt: ['', [Validators.required]],
    closesAt: ['', [Validators.required]],
    pickupStartDt: ['', [Validators.required]],
    pickupEndDt: ['', [Validators.required]],
    isActive: [true],
  });

  // Signal reflecting form value (not strictly required, but handy)
  formSig = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  // --- Signals for UI state ---
  events = signal<AdminHolidayEvent[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  editingExternalId = signal<string | null>(null);
  anchoredEventExternalId = signal<string | null>(null);

  autoSyncEnabled = signal(true);
  allDayEnabled = signal(true);

  showOnboardingTour = signal(false);
  currentTourStepIndex = signal(0);
  tourCardStyle = signal<Record<string, string>>({});
  tourSteps = signal<
    readonly { title: string; description: string; key: 'welcome' | 'nav' | 'editor' | 'continue' }[]
  >([]);

  private closesAtManuallyEdited = false;
  private pickupStartDtManuallyEdited = false;
  private pickupEndDtManuallyEdited = false;

  private tourEligibilitySubscription?: Subscription;
  private onboardingLaunchScheduled = false;
  private pendingNavigationTimeout: ReturnType<typeof setTimeout> | null = null;
  private quickTourDebugEnabled = false;

  private readonly quickTourEventHandler = () => {
    this.quickTourDebugEnabled = true;
    this.scheduleTourLaunch();
  };

  // --- Tour targets via ViewChild ---
  @ViewChild('welcomeStep') welcomeStep!: ElementRef<HTMLElement>;
  @ViewChild('eventsNav') eventsNav!: ElementRef<HTMLElement>;
  @ViewChild('eventEditorTitle') eventEditorTitle!: ElementRef<HTMLElement>;
  @ViewChild('continueButton') continueButton!: ElementRef<HTMLElement>;

  // Inputs for focusing/scrolling
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('opensAtInput') opensAtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('closesAtInput') closesAtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pickupStartDtInput') pickupStartDtInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pickupEndDtInput') pickupEndDtInput!: ElementRef<HTMLInputElement>;

  constructor() {
    // Effect to reposition tour card whenever step changes or viewport changes
    effect(() => {
      if (!this.showOnboardingTour()) return;
      this.applyTourStepPositioning();
    });
  }

  ngOnInit(): void {
    this.startCreate();
    this.loadEvents(true);

    if (typeof window !== 'undefined') {
      window.addEventListener(
        PreorderEventsAdminComponent.QUICK_TOUR_EVENT,
        this.quickTourEventHandler
      );
    }

    const forceTour =
      sessionStorage.getItem(PreorderEventsAdminComponent.FORCE_TOUR_KEY) === '1';
    this.quickTourDebugEnabled =
      sessionStorage.getItem(PreorderEventsAdminComponent.FORCE_TOUR_DEBUG_KEY) === '1';
    sessionStorage.removeItem(PreorderEventsAdminComponent.FORCE_TOUR_KEY);
    sessionStorage.removeItem(PreorderEventsAdminComponent.FORCE_TOUR_DEBUG_KEY);

    const currentUser = this.authService.currentUserValue;
    this.tourSteps.set(this.buildTourSteps(currentUser?.role));

    if (forceTour) {
      this.scheduleTourLaunch();
    }

    if (currentUser && currentUser.hasCompletedOnboarding !== true) {
      this.scheduleTourLaunch();
    }

    this.tourEligibilitySubscription = this.authService.currentUser.subscribe((user) => {
      if (
        !user ||
        user.hasCompletedOnboarding === true ||
        this.showOnboardingTour() ||
        this.onboardingLaunchScheduled
      ) {
        return;
      }

      this.tourSteps.set(this.buildTourSteps(user.role));
      this.scheduleTourLaunch();
    });

    this.authService.getMyProfile().subscribe({
      next: (profile) => {
        if (profile.role) {
          this.tourSteps.set(this.buildTourSteps(profile.role));
        }

        if (
          profile.hasCompletedOnboarding !== true &&
          !this.showOnboardingTour() &&
          !this.onboardingLaunchScheduled
        ) {
          this.scheduleTourLaunch();
        }
      },
      error: () => {
        if (this.quickTourDebugEnabled) {
          this.snackBar.open(
            'Quick Tour debug: profile check failed, but trigger still available.',
            'Close',
            {
              duration: 3000,
              panelClass: ['error-snackbar'],
            }
          );
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.tourEligibilitySubscription?.unsubscribe();

    if (this.pendingNavigationTimeout) {
      clearTimeout(this.pendingNavigationTimeout);
      this.pendingNavigationTimeout = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener(
        PreorderEventsAdminComponent.QUICK_TOUR_EVENT,
        this.quickTourEventHandler
      );
    }
  }

  // --- Tour building & control ---

  private scheduleTourLaunch(): void {
    if (this.showOnboardingTour() || this.onboardingLaunchScheduled) {
      return;
    }

    this.onboardingLaunchScheduled = true;
    setTimeout(() => {
      this.startOnboardingTour();
      this.onboardingLaunchScheduled = false;
    }, 250);
  }

  private buildTourSteps(role?: string): readonly {
    title: string;
    description: string;
    key: 'welcome' | 'nav' | 'editor' | 'continue';
  }[] {
    const normalizedRole = (role ?? '').toLowerCase();
    const isCompanyAdmin =
      normalizedRole === 'companyadmin' || normalizedRole === 'systemadmin';

    const navDescription = isCompanyAdmin
      ? 'Use these tabs for Events, Event Items, Pickup Time Slots, and Managing Customer Orders. Your sidebar also includes Profile Management, Store Preview, and Access Management.'
      : 'Use these tabs for Events, Event Items, Pickup Time Slots, and Managing Customer Orders. Your sidebar includes Profile Management and Store Preview.';

    return [
      {
        key: 'welcome',
        title: 'Welcome to BakeAhead',
        description:
          'We are excited to have you here. In just a few quick steps, you will see how BakeAhead enables you to create delightful experiences for your customers for all of your pre-order events. Let start the short tour together!',
      },
      {
        key: 'nav',
        title: 'Step 1: Navigation',
        description: navDescription,
      },
      {
        key: 'editor',
        title: 'Step 2: Create Your Event',
        description: 'Create your event and set pickup dates here before opening pre-orders.',
      },
      {
        key: 'continue',
        title: 'Step 3: Save and Continue',
        description:
          'Use this action to save and move to items when your event is ready after which create pickup time slots.',
      },
    ] as const;
  }

  private startOnboardingTour(): void {
    this.showOnboardingTour.set(true);
    this.currentTourStepIndex.set(0);
    this.applyTourStepPositioning();
  }

  get activeTourStep() {
    const steps = this.tourSteps();
    const idx = this.currentTourStepIndex();
    return steps[idx];
  }

  previousTourStep(): void {
    const idx = this.currentTourStepIndex();
    if (idx === 0) return;
    this.currentTourStepIndex.set(idx - 1);
  }

  nextTourStep(): void {
    const idx = this.currentTourStepIndex();
    const steps = this.tourSteps();
    if (idx >= steps.length - 1) {
      this.completeTour();
      return;
    }
    this.currentTourStepIndex.set(idx + 1);
  }

  skipTour(): void {
    this.completeTour();
  }

  private completeTour(): void {
    this.showOnboardingTour.set(false);
    this.currentTourStepIndex.set(0);

    this.authService.markOnboardingComplete().subscribe({
      next: () => {
        this.snackBar.open(
          'Thank you!  Quick Tour complete. You can view Quick Tour later from the sidebar.',
          'Close',
          {
            duration: 3500,
            panelClass: ['info-snackbar'],
          }
        );
      },
      error: () => {
        this.snackBar.open(
          'Could not save onboarding status. Quick Tour may appear again next login.',
          'Close',
          {
            duration: 4000,
            panelClass: ['error-snackbar'],
          }
        );
      },
    });
  }

  private getCurrentTourTarget(): HTMLElement | null {
    const step = this.activeTourStep;
    if (!step) return null;

    switch (step.key) {
      case 'welcome':
        return this.welcomeStep?.nativeElement ?? null;
      case 'nav':
        return this.eventsNav?.nativeElement ?? null;
      case 'editor':
        return this.eventEditorTitle?.nativeElement ?? null;
      case 'continue':
        return this.continueButton?.nativeElement ?? null;
      default:
        return null;
    }
  }

  private applyTourStepPositioning(): void {
    const target = this.getCurrentTourTarget();
    if (!target) {
      this.tourCardStyle.set({ top: '24px', left: '24px' });
      return;
    }

    if (this.ensureStepTargetInView(target)) {
      // After scroll, we’ll be called again by effect when layout settles
    }

    const rect = target.getBoundingClientRect();
    const cardWidth = 320;
    const estimatedCardHeight = 240;
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minTop = viewportWidth <= 960 ? 72 : margin;
    const maxTop = Math.max(minTop, viewportHeight - estimatedCardHeight - margin);

    let left = rect.left;
    if (left + cardWidth + margin > viewportWidth) {
      left = viewportWidth - cardWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    let top = rect.bottom + margin;
    if (top > maxTop) {
      top = rect.top - estimatedCardHeight - margin;
    }
    top = Math.min(maxTop, Math.max(minTop, top));

    this.tourCardStyle.set({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
    });
  }

  private ensureStepTargetInView(target: HTMLElement): boolean {
    const rect = target.getBoundingClientRect();
    const visibleTop = 72;
    const visibleBottom = window.innerHeight - 12;
    const isVisible = rect.top >= visibleTop && rect.bottom <= visibleBottom;

    if (isVisible) {
      return false;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    return true;
  }

  // --- Events loading & editing ---

  loadEvents(restoreAnchor = false): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.getAllHolidayEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        const anchor =
          this.preorderAdminService.getSelectedHolidayEventExternalId();
        this.anchoredEventExternalId.set(anchor);

        if (restoreAnchor && anchor) {
          const anchoredEvent = events.find((e) => e.externalId === anchor);
          if (anchoredEvent && this.canEditEvent(anchoredEvent)) {
            this.startEdit(anchoredEvent);
          }
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load pre-order events.');
        this.isLoading.set(false);
      },
    });
  }

  startCreate(): void {
    this.editingExternalId.set(null);
    this.successMessage.set('');
    this.allDayEnabled.set(true);
    this.resetAutoSyncTracking(true);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(-4, 0, 0, 0);
    const opens = tomorrow.toISOString().slice(0, 16);
    const closes = tomorrow.toISOString().slice(0, 16);

    this.form.reset({
      name: '',
      description: '',
      opensAt: opens,
      closesAt: closes,
      pickupStartDt: '',
      pickupEndDt: '',
      isActive: true,
    });

    if (this.allDayEnabled()) {
      this.applyAllDayTimes();
    }
  }

  canEditEvent(event: AdminHolidayEvent): boolean {
    if (!event.opensAt) return false;
    const opensAt = new Date(event.opensAt);
    if (Number.isNaN(opensAt.getTime())) return false;
    return opensAt.getTime() > Date.now();
  }

  startEdit(event: AdminHolidayEvent): void {
    this.editingExternalId.set(event.externalId);
    this.anchoredEventExternalId.set(event.externalId);
    this.successMessage.set('');
    this.allDayEnabled.set(false);
    this.resetAutoSyncTracking(false);
    this.preorderAdminService.setSelectedHolidayEventExternalId(event.externalId);

    this.form.setValue({
      name: event.name,
      description: event.description ?? '',
      opensAt: this.toDateTimeInput(event.opensAt),
      closesAt: this.toDateTimeInput(event.closesAt),
      pickupStartDt: this.toDateInput(event.pickupStartDt),
      pickupEndDt: this.toDateInput(event.pickupEndDt),
      isActive: event.isActive,
    });

    this.scrollToEditorStart();
  }

  activateToggleEvent(event: AdminHolidayEvent): void {
    const action = event.isActive ? 'deactivate' : 'activate';
    const deactivateMessage = `Deactivating ${event.name} will hide it from customers and prevent new pre-orders, but existing pre-orders will not be affected.`;
    const activateMessage = `Activating ${event.name} will make it visible to customers and allow new pre-orders.`;
    if (!confirm(event.isActive ? deactivateMessage : activateMessage)) {
      this.snackBar.open('Action cancelled.', 'Close', {
        duration: 3000,
        panelClass: ['info-snackbar'],
      });
      return;
    }

    const request: SaveHolidayEventRequest = {
      name: event.name,
      description: event.description,
      opensAt: event.opensAt,
      closesAt: event.closesAt,
      pickupStartDt: event.pickupStartDt,
      pickupEndDt: event.pickupEndDt,
      isActive: !event.isActive,
    };

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.preorderAdminService.updateHolidayEvent(event.externalId, request).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.loadEvents();
        this.snackBar.open(`Event ${action}d.`, 'Close', {
          duration: 3000,
          panelClass: ['info-snackbar'],
        });
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          extractErrorMessage(error, `Could not ${action} event.`)
        );
      },
    });
  }

  // --- Form helpers & sync logic ---

  onAllDayToggle(enabled: boolean): void {
    this.allDayEnabled.set(enabled);
    if (enabled) {
      this.applyAllDayTimes();
      if (this.autoSyncEnabled()) {
        this.syncPickup();
      }
    }
  }

  onAutoSyncToggle(enabled: boolean): void {
    this.resetAutoSyncTracking(enabled);
  }

  syncNow(): void {
    this.resetAutoSyncTracking(true);

    const opensAt = this.form.controls.opensAt.value;
    if (!opensAt) return;

    if (this.allDayEnabled()) {
      const normalizedOpens = this.setTimePart(opensAt, '00:00');
      this.form.controls.opensAt.setValue(normalizedOpens);
      this.form.controls.closesAt.setValue(
        this.setTimePart(normalizedOpens, '23:59')
      );
      this.syncPickup();
      return;
    }

    this.syncClose();
  }

  onOpensAtChanged(): void {
    const opensAt = this.form.controls.opensAt.value;
    if (!opensAt) return;

    if (this.allDayEnabled()) {
      this.form.controls.opensAt.setValue(
        this.setTimePart(opensAt, '00:00')
      );
    }

    if (this.autoSyncEnabled()) {
      this.syncClose();
    }
  }

  onClosesAtChanged(): void {
    const closesAt = this.form.controls.closesAt.value;
    if (!closesAt) return;

    if (this.allDayEnabled()) {
      this.form.controls.closesAt.setValue(
        this.setTimePart(closesAt, '23:59')
      );
    }

    this.closesAtManuallyEdited = true;
    if (this.autoSyncEnabled()) {
      this.syncPickup();
    }
  }

  onPickupStartChanged(): void {
    this.pickupStartDtManuallyEdited = true;
    if (this.autoSyncEnabled()) {
      this.syncPickupEnd();
    }
  }

  onPickupEndChanged(): void {
    this.pickupEndDtManuallyEdited = true;
  }

  setOpensMidnight(): void {
    const current = this.form.controls.opensAt.value;
    if (!current) return;
    const updated = this.setTimePart(current, '00:00');
    this.form.controls.opensAt.setValue(updated);
    this.onOpensAtChanged();
  }

  setClosesEndOfDay(): void {
    const current = this.form.controls.closesAt.value;
    if (!current) return;
    const updated = this.setTimePart(current, '23:59');
    this.form.controls.closesAt.setValue(updated);
    this.onClosesAtChanged();
  }

  syncClose(): void {
    const opensAt = this.form.controls.opensAt.value;
    if (!opensAt) return;

    if (!this.closesAtManuallyEdited && !this.autoSyncEnabled()) {
      this.form.controls.closesAt.setValue(
        this.allDayEnabled()
          ? this.setTimePart(opensAt, '23:59')
          : opensAt
      );
    }

    if (this.autoSyncEnabled()) {
      this.form.controls.closesAt.setValue(
        this.allDayEnabled()
          ? this.setTimePart(opensAt, '23:59')
          : opensAt
      );
      this.syncPickup();
    }
  }

  syncPickup(): void {
    const closesAt = this.form.controls.closesAt.value;
    if (!closesAt) return;

    const pickupDate = closesAt.split('T')[0] ?? '';

    if (!this.pickupStartDtManuallyEdited) {
      this.form.controls.pickupStartDt.setValue(pickupDate);
    }

    if (!this.pickupEndDtManuallyEdited) {
      this.form.controls.pickupEndDt.setValue(pickupDate);
    }
  }

  syncPickupEnd(): void {
    const pickupStart = this.form.controls.pickupStartDt.value;
    if (!pickupStart) return;

    if (!this.pickupEndDtManuallyEdited) {
      this.form.controls.pickupEndDt.setValue(pickupStart);
    }
  }

  saveEvent(nextRoute?: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      if (this.form.controls.name.invalid) {
        this.snackBar.open('Event name is required.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        this.focusValidationField(this.nameInput);
        return;
      }
      if (this.form.controls.opensAt.invalid) {
        this.snackBar.open('Event Open date/time is required.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        this.focusValidationField(this.opensAtInput);
        return;
      }
      if (this.form.controls.closesAt.invalid) {
        this.snackBar.open('Event Close date/time is required.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        this.focusValidationField(this.closesAtInput);
        return;
      }
      if (this.form.controls.pickupStartDt.invalid) {
        this.snackBar.open('Pickup start date is required.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        this.focusValidationField(this.pickupStartDtInput);
        return;
      }
      if (this.form.controls.pickupEndDt.invalid) {
        this.snackBar.open('Pickup end date is required.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
        this.focusValidationField(this.pickupEndDtInput);
        return;
      }
    }

    this.isSaving.set(true);

    const raw = this.form.getRawValue();
    const request: SaveHolidayEventRequest = {
      name: raw.name.trim(),
      description: raw.description?.trim() || undefined,
      opensAt: raw.opensAt,
      closesAt: raw.closesAt,
      pickupStartDt: raw.pickupStartDt,
      pickupEndDt: raw.pickupEndDt,
      isActive: raw.isActive ?? true,
    };

    const editingId = this.editingExternalId();
    const save$ = editingId
      ? this.preorderAdminService.updateHolidayEvent(editingId, request)
      : this.preorderAdminService.createHolidayEvent(request);

    save$.subscribe({
      next: (savedEvent) => {
        this.isSaving.set(false);
        const successMessage = editingId ? 'Event updated.' : 'Event created.';
        this.successMessage.set(successMessage);
        this.preorderAdminService.setSelectedHolidayEventExternalId(
          savedEvent.externalId
        );
        this.snackBar.open(successMessage, 'Close', {
          duration: 3000,
          panelClass: ['info-snackbar'],
        });

        if (nextRoute) {
          this.navigateWithDelay(nextRoute);
          return;
        }

        this.startCreate();
        this.loadEvents();
      },
      error: (error) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          extractErrorMessage(error, 'Could not save pre-order event.')
        );
      },
    });
  }

  saveAndGoToMenu(): void {
    this.saveEvent('/admin/menu');
  }

  private navigateWithDelay(route: string): void {
    if (this.pendingNavigationTimeout) {
      clearTimeout(this.pendingNavigationTimeout);
    }

    this.pendingNavigationTimeout = setTimeout(() => {
      this.pendingNavigationTimeout = null;
      this.router.navigate([route]);
    }, PreorderEventsAdminComponent.SAVE_CONTINUE_NAV_DELAY_MS);
  }

  // --- Date helpers ---

  private toDateTimeInput(value: string): string {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
  }

  private toDateInput(value: string): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private applyAllDayTimes(): void {
    const opensAt = this.form.controls.opensAt.value;
    const closesAt = this.form.controls.closesAt.value;
    if (opensAt) {
      this.form.controls.opensAt.setValue(
        this.setTimePart(opensAt, '00:00')
      );
    }
    if (closesAt) {
      this.form.controls.closesAt.setValue(
        this.setTimePart(closesAt, '23:59')
      );
    }
  }

  private setTimePart(value: string, time: string): string {
    if (!value) return value;

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
    if (!match) return null;

    const [, monthRaw, dayRaw, year] = match;
    const month = monthRaw.padStart(2, '0');
    const day = dayRaw.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resetAutoSyncTracking(autoSyncEnabled: boolean): void {
    this.autoSyncEnabled.set(autoSyncEnabled);
    this.closesAtManuallyEdited = false;
    this.pickupStartDtManuallyEdited = false;
    this.pickupEndDtManuallyEdited = false;
  }

  private focusValidationField(inputRef: ElementRef<HTMLInputElement>): void {
    const input = inputRef?.nativeElement;
    if (!input) return;

    if (this.isMobileViewport()) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    input.focus();
  }

  private scrollToEditorStart(): void {
    const input = this.nameInput?.nativeElement;
    if (!input) return;

    input.scrollIntoView({
      behavior: 'smooth',
      block: this.isMobileViewport() ? 'center' : 'start',
      inline: 'nearest',
    });

    if (!this.isMobileViewport()) {
      setTimeout(() => input.focus(), 220);
    }
  }

  private isMobileViewport(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }
}
