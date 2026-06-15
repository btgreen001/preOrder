import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-step2',
  templateUrl: './company-stripe-onboarding.component.html',
  styleUrls: ['./company-stripe-onboarding.component.scss']
})
export class Step2Component {
  loading = false;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  startStripeOnboarding() {
    this.loading = true;
    this.error = null;

    this.http.post<{ url: string }>('/api/stripe/create-onboarding-link', {})
      .subscribe({
        next: (res) => {
          window.location.href = res.url; // Redirect to Stripe
        },
        error: (err) => {
          this.loading = false;
          this.error = 'Unable to start onboarding. Please try again.';
          console.error(err);
        }
      });
  }
}
