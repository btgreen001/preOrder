import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  PublicCreatePreOrderRequest,
  PublicHolidayEvent,
  PublicMenuItem,
  PublicOrganizationDtl,
  PublicPickupSlot,
  PublicPreOrderResponse,
  PublicSendOrderEmailRequest,
  PublicPreorderService
} from '../../core/services/public-preorder.service';

interface CartItem {
  menuItemExternalId: string;
  name: string;
  description?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  maxPerOrder?: number | null;
}

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

@Component({
  selector: 'app-order-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './order-builder.component.html',
  styleUrls: ['./order-builder.component.scss']
})
export class OrderBuilderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly preorderService = inject(PublicPreorderService);
  private readonly snackBar = inject(MatSnackBar);

  currentStep = 1;
  totalSteps = 4;

  organizationToken = '';
  isLoading = true;
  isSubmitting = false;
  loadError = '';
  submitError = '';
  submitSuccess: PublicPreOrderResponse | null = null;
  pickupAvailabilityWarning = '';
  private lastNoPickupCapacityAlertEventId = '';

  holidayEvents: PublicHolidayEvent[] = [];
  availableMenuItems: PublicMenuItem[] = [];
  pickupSlots: PublicPickupSlot[] = [];
  organization: PublicOrganizationDtl | null = null;
  selectedHolidayEventExternalId = '';
  selectedPickupSlotExternalId = '';

  customer: CustomerForm = {
    name: '',
    email: '',
    phone: '',
    notes: ''
  };

  cart: CartItem[] = [];

  ngOnInit(): void {
    const queryToken = this.route.snapshot.queryParamMap.get('org')?.trim() ?? '';
    this.organizationToken = queryToken;

    if (!this.organizationToken) {
      this.isLoading = false;
      this.loadError = 'This preorder link is missing the bakery organization token. Please check the link and try again or contact support.';
      return;
    }

    this.loadHolidayEvents();
  }

  get selectedHolidayEvent(): PublicHolidayEvent | undefined {
    return this.holidayEvents.find(event => event.externalId === this.selectedHolidayEventExternalId);
  }

  get selectedPickupSlot(): PublicPickupSlot | undefined {
    return this.pickupSlots.find(slot => slot.externalId === this.selectedPickupSlotExternalId);
  }

  get cartTotal(): number {
    return this.cart.reduce((total, item) => total + item.totalPrice, 0);
  }

  get cartCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  get hasPickupCapacity(): boolean {
    return this.pickupSlots.some(slot => slot.capacity > slot.reservedCount);
  }

  getCartItemQuantity(menuItemExternalId: string): number {
    return this.cart.find(item => item.menuItemExternalId === menuItemExternalId)?.quantity ?? 0;
  }

  canIncreaseItem(item: PublicMenuItem): boolean {
    const quantity = this.getCartItemQuantity(item.externalId);
    return !item.maxPerOrder || quantity < item.maxPerOrder;
  }

  loadHolidayEvents(): void {
    this.isLoading = true;
    this.loadError = '';

    this.preorderService.getHolidayEvents(this.organizationToken).subscribe({
      next: events => {
        this.holidayEvents = events;

        if (events.length === 0) {
          this.availableMenuItems = [];
          this.pickupSlots = [];
          this.organization = null;
          this.selectedHolidayEventExternalId = '';
          this.isLoading = false;
          return;
        }

        this.selectedHolidayEventExternalId = events[0].externalId;
        this.loadSelectedHolidayEventData();
      },
      error: error => {
        this.isLoading = false;
        this.loadError = this.getErrorMessage(error, 'Unable to load pre-order events.');
      }
    });
  }

  onHolidayEventChange(): void {
    this.cart = [];
    this.selectedPickupSlotExternalId = '';
    this.submitError = '';
    this.submitSuccess = null;
    this.pickupAvailabilityWarning = '';
    this.currentStep = 1;
    this.loadSelectedHolidayEventData();
    this.snackBar.open('Holiday event changed. Menu and pickup options reloaded.', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  addToCart(item: PublicMenuItem): void {
    const existingItem = this.cart.find(cartItem => cartItem.menuItemExternalId === item.externalId);
    const maxPerOrder = item.maxPerOrder ?? undefined;

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;
      existingItem.quantity = maxPerOrder ? Math.min(nextQuantity, maxPerOrder) : nextQuantity;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
      return;
    }

    this.cart.push({
      menuItemExternalId: item.externalId,
      name: item.name,
      description: item.description,
      unitPrice: item.price,
      quantity: 1,
      totalPrice: item.price,
      maxPerOrder: item.maxPerOrder
    });
  }

  removeFromCart(menuItemExternalId: string): void {
    this.cart = this.cart.filter(item => item.menuItemExternalId !== menuItemExternalId);
  }

  updateQuantity(menuItemExternalId: string, quantity: number): void {
    const item = this.cart.find(cartItem => cartItem.menuItemExternalId === menuItemExternalId);
    if (!item) {
      return;
    }

    if (quantity <= 0) {
      this.removeFromCart(menuItemExternalId);
      return;
    }

    const cappedQuantity = item.maxPerOrder ? Math.min(quantity, item.maxPerOrder) : quantity;
    item.quantity = cappedQuantity;
    item.totalPrice = item.unitPrice * item.quantity;
  }

  nextStep(): void {
    if (this.currentStep === 1 && !this.hasPickupCapacity) {
      const message = this.pickupAvailabilityWarning || 'This event has no pickup slots with remaining capacity. Please select another event.';
      this.submitError = message;
      alert(message);
      return;
    }

    if (this.currentStep < this.totalSteps && this.canProceedToNext()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitOrder(): void {
    if (!this.selectedHolidayEventExternalId || !this.selectedPickupSlotExternalId || this.cart.length === 0) {
      this.submitError = 'Complete the menu and pickup selection before submitting.';
      return;
    }

    const request: PublicCreatePreOrderRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId,
      pickupSlotExternalId: this.selectedPickupSlotExternalId,
      customerName: this.customer.name.trim(),
      customerEmail: this.customer.email.trim(),
      customerPhone: this.customer.phone.trim() || undefined,
      notes: this.customer.notes.trim() || undefined,
      lines: this.cart.map(item => ({
        menuItemExternalId: item.menuItemExternalId,
        quantity: item.quantity
      }))
    };

    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = null;

    this.preorderService.createPreOrder(this.organizationToken, request).subscribe({
      next: preorder => {
        const orderEmailRequest: PublicSendOrderEmailRequest = {
          customerName: this.customer.name.trim(),
          customerEmail: this.customer.email.trim(),
          orderExternalId: preorder.externalId,
          slotStartAt: this.selectedPickupSlot?.slotStartAt ?? '',
          slotEndAt: this.selectedPickupSlot?.slotEndAt ?? '',
          lines: this.cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        };

        this.preorderService.sendOrderEmail(this.organizationToken, orderEmailRequest).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.submitSuccess = preorder;
          },
          error: () => {
            // Keep checkout successful even if confirmation email fails.
            this.isSubmitting = false;
            this.submitSuccess = preorder;
          }
        });
      },
      error: error => {
        this.isSubmitting = false;
        this.submitError = this.getErrorMessage(error, 'Unable to submit preorder.');
      }
    });
  }

  canProceedToNext(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedHolidayEventExternalId && this.cart.length > 0 && this.hasPickupCapacity;
      case 2:
        return !!(this.customer.name.trim() && this.customer.email.trim() && this.customer.phone.trim());
      case 3:
        return !!this.selectedPickupSlotExternalId;
      case 4:
        return true;
      default:
        return false;
    }
  }

  startAnotherOrder(): void {
    this.currentStep = 1;
    this.customer = {
      name: '',
      email: '',
      phone: '',
      notes: ''
    };
    this.cart = [];
    this.selectedPickupSlotExternalId = '';
    this.submitError = '';
    this.submitSuccess = null;
    this.loadSelectedHolidayEventData();
  }

  private loadSelectedHolidayEventData(): void {
    if (!this.selectedHolidayEventExternalId) {
      this.availableMenuItems = [];
      this.pickupSlots = [];
      this.organization = null;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      organization: this.preorderService.getOrganizationDetails(this.organizationToken),
      menuItems: this.preorderService.getMenuItems(this.organizationToken, this.selectedHolidayEventExternalId),
      pickupSlots: this.preorderService.getPickupSlots(this.organizationToken, this.selectedHolidayEventExternalId)
    }).subscribe({
      next: result => {
        this.organization = result.organization;
        this.availableMenuItems = result.menuItems;
        this.pickupSlots = result.pickupSlots;
        const availableSlots = result.pickupSlots.filter(slot => slot.capacity > slot.reservedCount);
        this.selectedPickupSlotExternalId = availableSlots[0]?.externalId ?? '';

        if (availableSlots.length === 0) {
          this.pickupAvailabilityWarning = 'No pickup slots remain for this event. Please choose a different event.';
          const currentEventId = this.selectedHolidayEventExternalId;
          if (currentEventId && currentEventId !== this.lastNoPickupCapacityAlertEventId) {
            this.lastNoPickupCapacityAlertEventId = currentEventId;
//            alert(this.pickupAvailabilityWarning);
          }
        } else {
          this.pickupAvailabilityWarning = '';
        }

        this.isLoading = false;
      },
      error: error => {
        this.isLoading = false;
        this.loadError = this.getErrorMessage(error, 'Unable to load menu items and pickup slots.');
      }
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const candidate = error as { error?: { message?: string }; message?: string };
      return candidate.error?.message ?? candidate.message ?? fallback;
    }

    return fallback;
  }
}
