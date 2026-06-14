import { Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { CheckoutComponent } from '../../checkout/checkout.component';
import { PaymentService } from '../../../shared-data-services/stripe.payment.service';
import { OrdersService } from '../../features/orders/services/orders.service';

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

@Component({
  selector: 'app-order-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CheckoutComponent],
  templateUrl: './order-builder.component.html',
  styleUrls: ['./order-builder.component.scss']

})


export class OrderBuilderComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly preorderService = inject(PublicPreorderService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly paymentService = inject(PaymentService);
  private readonly orderService = inject(OrdersService);


  @ViewChild('checkout') checkout!: CheckoutComponent;

  // -----------------------------
  // Signals (state)
  // -----------------------------
  currentStep = signal(1);
  totalSteps = 5;

  organizationToken = signal('');
  isLoading = signal(true);
  isSubmitting = signal(false);
  loadError = signal('');
  submitError = signal('');
  submitSuccess = signal<PublicPreOrderResponse | null>(null);
  pickupAvailabilityWarning = signal('');
  lastNoPickupCapacityAlertEventId = signal('');
  preOrderResponse = signal<PublicPreOrderResponse | null>(null);
  orderAmount = signal<number | null>(null);

  holidayEvents = signal<PublicHolidayEvent[]>([]);
  availableMenuItems = signal<PublicMenuItem[]>([]);
  pickupSlots = signal<PublicPickupSlot[]>([]);
  organization = signal<PublicOrganizationDtl | null>(null);

  selectedHolidayEventExternalId = signal('');
  selectedPickupSlotExternalId = signal('');

  customer = signal({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  cart = signal<CartItem[]>([]);

  // -----------------------------
  // Computed Signals
  // -----------------------------
  selectedHolidayEvent = computed(() =>
    this.holidayEvents().find(e => e.externalId === this.selectedHolidayEventExternalId())
  );

  selectedPickupSlot = computed(() =>
    this.pickupSlots().find(s => s.externalId === this.selectedPickupSlotExternalId())
  );

  cartTotal = computed(() =>
    this.cart().reduce((t, i) => t + i.totalPrice, 0)
  );

  cartCount = computed(() =>
    this.cart().reduce((t, i) => t + i.quantity, 0)
  );

  hasPickupCapacity = computed(() =>
    this.pickupSlots().some(s => s.capacity > s.reservedCount)
  );

  // -----------------------------
  // Constructor (replaces ngOnInit)
  // -----------------------------
  constructor() {
    const token = this.route.snapshot.queryParamMap.get('org')?.trim() ?? '';
    this.organizationToken.set(token);

    if (!token) {
      this.isLoading.set(false);
      this.loadError.set(
        'This preorder link is missing the bakery organization token. Please check the link and try again or contact support.'
      );
      return;
    }

    this.loadHolidayEvents();
  }

  // -----------------------------
  // Methods
  // -----------------------------
  onSelect(slot: PublicPickupSlot) {
    if (slot.reservedCount < slot.capacity) {
      this.selectedPickupSlotExternalId.set(slot.externalId);
    }
  }

  onKeydown(event: KeyboardEvent, slot: PublicPickupSlot) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelect(slot);
    }
  }

  getCartItemQuantity(menuItemExternalId: string): number {
    return this.cart().find(i => i.menuItemExternalId === menuItemExternalId)?.quantity ?? 0;
  }

  canIncreaseItem(item: PublicMenuItem): boolean {
    const qty = this.getCartItemQuantity(item.externalId);
    return !item.maxPerOrder || qty < item.maxPerOrder;
  }

  // -----------------------------
  // Load Holiday Events
  // -----------------------------
  loadHolidayEvents() {
    this.isLoading.set(true);
    this.loadError.set('');

    this.preorderService.getHolidayEvents(this.organizationToken()).subscribe({
      next: events => {
        this.holidayEvents.set(events);

        if (events.length === 0) {
          this.availableMenuItems.set([]);
          this.pickupSlots.set([]);
          this.organization.set(null);
          this.selectedHolidayEventExternalId.set('');
          this.isLoading.set(false);
          return;
        }

        this.selectedHolidayEventExternalId.set(events[0].externalId);
        this.loadSelectedHolidayEventData();
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(this.getErrorMessage(err, 'Unable to load pre-order events.'));
      }
    });
  }

  // -----------------------------
  // Holiday Event Change
  // -----------------------------
  onHolidayEventChange() {
    this.cart.set([]);
    this.selectedPickupSlotExternalId.set('');
    this.submitError.set('');
    this.submitSuccess.set(null);
    this.pickupAvailabilityWarning.set('');
    this.currentStep.set(1);

    this.loadSelectedHolidayEventData();

    this.snackBar.open('Holiday event changed. Your cart has been reset.', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  // -----------------------------
  // Cart Management
  // -----------------------------
  addToCart(item: PublicMenuItem) {
    this.cart.update(cart => {
      const existing = cart.find(c => c.menuItemExternalId === item.externalId);
      const max = item.maxPerOrder ?? undefined;

      if (existing) {
        const nextQty = existing.quantity + 1;
        existing.quantity = max ? Math.min(nextQty, max) : nextQty;
        existing.totalPrice = existing.unitPrice * existing.quantity;
        return [...cart];
      }

      return [
        ...cart,
        {
          menuItemExternalId: item.externalId,
          name: item.name,
          description: item.description,
          unitPrice: item.price,
          quantity: 1,
          totalPrice: item.price,
          maxPerOrder: item.maxPerOrder
        }
      ];
    });
  }

  removeFromCart(id: string) {
    this.cart.update(cart => cart.filter(i => i.menuItemExternalId !== id));
  }

  updateQuantity(id: string, quantity: number) {
    this.cart.update(cart => {
      const item = cart.find(i => i.menuItemExternalId === id);
      if (!item) return cart;

      if (quantity <= 0) return cart.filter(i => i.menuItemExternalId !== id);

      const capped = item.maxPerOrder ? Math.min(quantity, item.maxPerOrder) : quantity;
      item.quantity = capped;
      item.totalPrice = item.unitPrice * capped;
      return [...cart];
    });
  }

  // -----------------------------
  // Step Navigation
  // -----------------------------
  nextStep() {
    if (this.currentStep() === 1 && !this.hasPickupCapacity()) {
      const msg =
        this.pickupAvailabilityWarning() ||
        'This event has no pickup slots with remaining capacity. Please select another event.';
      this.submitError.set(msg);
      alert(msg);
      return;
    }

    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  // -----------------------------
  // Submit Pending Order before payment
  // -----------------------------
  submitOrder() {
    if (!this.selectedHolidayEventExternalId() ||
        !this.selectedPickupSlotExternalId() ||
        this.cart().length === 0) {
      this.submitError.set('Complete the menu and pickup selection before submitting.');
      return;
    }

    const request: PublicCreatePreOrderRequest = {
      holidayEventExternalId: this.selectedHolidayEventExternalId(),
      pickupSlotExternalId: this.selectedPickupSlotExternalId(),
      customerName: this.customer().name.trim(),
      customerEmail: this.customer().email.trim(),
      customerPhone: this.customer().phone.trim() || undefined,
      notes: this.customer().notes.trim() || undefined,
      lines: this.cart().map(i => ({
        menuItemExternalId: i.menuItemExternalId,
        quantity: i.quantity
      }))
    };

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set(null);

    this.preorderService.createPreOrder(this.organizationToken(), request)
      .subscribe({
        next: preorder => {
          // ⭐ Save preorder so Step 5 can use it
          this.preOrderResponse.set(preorder);

           // ⭐ NEW: store the amount for the payment screen
          this.orderAmount.set(preorder.totalAmount); 
          this.isSubmitting.set(false);
          // ⭐ Move to payment step
          this.nextStep()
        },
        error: err => {
          this.isSubmitting.set(false);
          this.submitError.set(this.getErrorMessage(err, 'Unable to submit preorder.'));
        }
      });
  }

  cancelOrder(preorder: PublicPreOrderResponse | null = this.preOrderResponse()): void {
    if (!preorder) {
      this.startAnotherOrder();
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');

    this.orderService.cancelOrder(preorder.externalId)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackBar.open('Order cancelled. You can start a new order now.', 'Close', {  duration: 3000, panelClass: ['success-snackbar'] });
          this.startAnotherOrder();
        },
        error: err => {
          this.isSubmitting.set(false);
          this.submitError.set(this.getErrorMessage(err, 'Unable to cancel order.'));
        }
      });
  }

  // payOrder(preorder: PublicPreOrderResponse) {
  //   this.isSubmitting.set(true);
  //   this.submitError.set('');

  //   // 1. Create payment intent or redirect to payment page
  //   console.log('Creating payment intent for preorder:', preorder);
  //   this.paymentService.createPaymentIntent({ orderId: preorder.externalId, orderType: 'preorder', untrustedOrderAmt: preorder.totalAmount.toString() })
  //     .subscribe({
  //       next: paymentIntent => {
  //         console.log('Created payment intent for preorder:', preorder);
  //         // TODO: integrate with your payment provider here
  //         // e.g., stripe.confirmCardPayment(paymentIntent.clientSecret)

  //         // 2. After successful payment, mark order submitted, and send confirmation email and show Thank You state.

  //         this.preorderService.markOrderAsSubmitted(preorder.externalId)
  //           .subscribe({
  //             next: () => {
  //               this.finalizeSuccessfulPayment(preorder);
  //             },
  //             error: err => {
  //               this.isSubmitting.set(false);
  //               this.submitError.set(this.getErrorMessage(err, 'Unable to finalize payment for order.'));
  //             }
  //           });

  //         },
  //       error: err => {
  //         this.isSubmitting.set(false);
  //         this.submitError.set(this.getErrorMessage(err, 'Unable to initiate payment.'));
  //       }
  //     });
  // }

  handleCheckoutSuccess() {
    const preorder = this.preOrderResponse();
    if (!preorder) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    this.preorderService.markOrderAsSubmitted(this.organizationToken(), preorder.externalId)
      .subscribe({
        next: () => {
          this.finalizeSuccessfulPayment(preorder);
        },
        error: err => {
          // Payment succeeded in Stripe, but order finalization failed
          this.isSubmitting.set(false);
          this.submitError.set(
            this.getErrorMessage(err, 'Payment succeeded, but we could not finalize your order.')
          );

          // You could log this or send it to your backend here if you want,
          // but don't block the user from seeing success if you know payment is done.
        }
      });
  }

  private finalizeSuccessfulPayment(preorder: PublicPreOrderResponse) {
    const emailReq: PublicSendOrderEmailRequest = {
      customerName: this.customer().name.trim(),
      customerEmail: this.customer().email.trim(),
      orderExternalId: preorder.externalId,
      slotStartAt: this.selectedPickupSlot()?.slotStartAt ?? '',
      slotEndAt: this.selectedPickupSlot()?.slotEndAt ?? '',
      lines: this.cart().map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    this.preorderService.sendOrderEmail(this.organizationToken(), emailReq)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitSuccess.set(preorder);
          this.snackBar.open('Order paid successfully.', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: () => {
          this.isSubmitting.set(false);
          this.submitSuccess.set(preorder);
          this.snackBar.open('Payment completed, but confirmation email failed to send.', 'Close', {
            duration: 4000,
            panelClass: ['warning-snackbar']
          });
        }
      });
  }

  canProceedToNext(): boolean {
  switch (this.currentStep()) {
    case 1:
      return (
        !!this.selectedHolidayEventExternalId() &&
        this.cart().length > 0 &&
        this.hasPickupCapacity()
      );

    case 2:
      const c = this.customer();
      return !!(c.name.trim() && c.email.trim() && c.phone.trim());

    case 3:
      return !!this.selectedPickupSlotExternalId();

    case 4:
      return true;

    case 5:
      return !!this.preOrderResponse();

    default:
      return false;
  }
}

startAnotherOrder(): void {
  this.currentStep.set(1);

  this.customer.set({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  this.cart.set([]);
  this.selectedPickupSlotExternalId.set('');
  this.submitError.set('');
  this.submitSuccess.set(null);

  this.loadSelectedHolidayEventData();
}

private loadSelectedHolidayEventData(): void {
  if (!this.selectedHolidayEventExternalId()) {
    this.availableMenuItems.set([]);
    this.pickupSlots.set([]);
    this.organization.set(null);
    this.isLoading.set(false);
    return;
  }

  this.isLoading.set(true);
  this.loadError.set('');

  forkJoin({
    organization: this.preorderService.getOrganizationDetails(this.organizationToken()),
    menuItems: this.preorderService.getMenuItems(
      this.organizationToken(),
      this.selectedHolidayEventExternalId()
    ),
    pickupSlots: this.preorderService.getPickupSlots(
      this.organizationToken(),
      this.selectedHolidayEventExternalId()
    )
  }).subscribe({
    next: (result: {
      organization: PublicOrganizationDtl;
      menuItems: PublicMenuItem[];
      pickupSlots: PublicPickupSlot[];
    }) => {
      this.organization.set(result.organization);
      this.availableMenuItems.set(result.menuItems);
      this.pickupSlots.set(result.pickupSlots);

      const availableSlots = result.pickupSlots.filter(
        (slot: PublicPickupSlot) => slot.capacity > slot.reservedCount
      );

      this.selectedPickupSlotExternalId.set(
        availableSlots[0]?.externalId ?? ''
      );

      if (availableSlots.length === 0) {
        this.pickupAvailabilityWarning.set(
          'No pickup slots remain for this event. Please choose a different event.'
        );

        const currentEventId = this.selectedHolidayEventExternalId();
        if (currentEventId && currentEventId !== this.lastNoPickupCapacityAlertEventId()) {
          this.lastNoPickupCapacityAlertEventId.set(currentEventId);
          // alert suppressed intentionally
        }
      } else {
        this.pickupAvailabilityWarning.set('');
      }

      this.isLoading.set(false);
    },

    error: (error: unknown) => {
      this.isLoading.set(false);
      this.loadError.set(
        this.getErrorMessage(error, 'Unable to load menu items and pickup slots.')
      );
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