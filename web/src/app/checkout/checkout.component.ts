import { Component, OnInit, inject } from '@angular/core';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { PaymentService } from '../../shared-data-services/stripe.payment.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: true,
  imports: [CommonModule]

})

export class CheckoutComponent implements OnInit {

  private paymentService = inject(PaymentService);
  private router = inject(Router);

  stripe!: Stripe | null;
  card!: StripeCardElement;
  clientSecret!: string;
  orderId!: string;
  orderType!: string;
  returnUrl!: string;
  loading = false;
  message = '';

  async ngOnInit() {
    const stripeKey = import.meta.env['NG_APP_STRIPE_PUBLISHABLE_KEY'];
    this.stripe = await loadStripe(stripeKey);

    const elements = this.stripe!.elements({
      appearance: {},
      paymentMethodCreation: 'manual'
    });

    this.card = elements.create('card', {
      disableLink: true
    });

    this.card.mount('#card-element');
    this.orderId = '12345'; // This should come from your order data
    this.orderType = 'preorder'; // This should be set based on your order type
    this.returnUrl = this.router.url; // Current URL as return URL

  }

  async startPayment() {
  this.loading = true;
  this.message = '';

  // Send identifiers, not the amount
  this.paymentService.createPaymentIntent({
      orderId: this.orderId,
      orderType: this.orderType,
      returnUrl: this.returnUrl
    }).subscribe({
    next: async (res) => {
      this.clientSecret = res.clientSecret;
      const returnUrl = res.returnUrl;   // <-- backend-provided return URL

      const result = await this.stripe!.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.card
        }
      });

      if (result.error) {
        this.message = result.error.message ?? 'Payment failed';
      } else if (result.paymentIntent?.status === 'succeeded') {
        this.message = 'Payment successful';

        // Redirect to the correct page
        this.router.navigate([returnUrl]);
      }

      this.loading = false;
    },
    error: (err) => {
      this.message = 'Error creating payment intent';
      console.error(err);
      this.loading = false;
    }
  });
}

}
