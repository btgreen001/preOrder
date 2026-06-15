import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { input } from '@angular/core';

export interface CreatePaymentIntentRequest {
  orderId: string;
  orderType: string;
  untrustedOrderAmt: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  returnUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = window.__env.NG_APP_API_URL;
  private readonly apiUrl = `${this.apiBaseUrl}/payment`;

  createPaymentIntent(data: CreatePaymentIntentRequest): Observable<CreatePaymentIntentResponse> {

    return this.http.post<CreatePaymentIntentResponse>(
      `${this.apiUrl}/create-intent/${encodeURIComponent(data.orderType)}`,
      data
    );
  }
}
