import { Component, Input, inject, DestroyRef, effect, signal, output } from '@angular/core';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { PaymentService } from '../../shared-data-services/stripe.payment.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { input } from '@angular/core';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {

  // Angular 17+ style input signal
  orderId = input.required<string>();
  orderType = input.required<string>();
  untrustedOrderAmt = input.required<string>();
  redirectOnSuccess = input<boolean>(true);

  private paymentService = inject(PaymentService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  stripe!: Stripe | null;
  card!: StripeCardElement;

  loading = signal(false);
  message = signal('');
  paymentSucceeded = output<void>();

  constructor() {
    // Initialize Stripe when orderId becomes available
    effect(() => {
      const id = this.orderId();
      if (id) {
        this.initializeStripe();
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      if (this.card) {
        this.card.unmount();
      }
    });
  }

  private async initializeStripe() {

    const stripeKey = import.meta.env.VITE_NG_APP_STRIPE_PUBLISHABLE_KEY;
    this.stripe = await loadStripe(stripeKey);

    const elements = this.stripe!.elements({
      appearance: {},
      paymentMethodCreation: 'manual'
    });

    this.card = elements.create('card', { disableLink: true });
    this.card.mount('#card-element');
  }

  async startPayment() {
    this.loading.set(true);
    this.message.set('');

    this.paymentService.createPaymentIntent({
      orderId: this.orderId(),
      orderType: this.orderType(),
      untrustedOrderAmt: this.untrustedOrderAmt()
    }).subscribe({
      next: async (res) => {
        const result = await this.stripe!.confirmCardPayment(res.clientSecret, {
          payment_method: { card: this.card }
        });

        if (result.error) {
          this.message.set(result.error.message ?? 'Payment failed');
        } else if (result.paymentIntent?.status === 'succeeded') {
          this.message.set('Payment successful');
          this.paymentSucceeded.emit();

          const returnUrl = (res.returnUrl ?? '').trim();
          if (this.redirectOnSuccess() && returnUrl) {
            this.router.navigate([returnUrl]);
          }
        }

        this.loading.set(false);
      },
      error: (err) => {
        this.message.set('Error creating payment intent');
        console.error(err);
        this.loading.set(false);
      }
    });
  }
}
