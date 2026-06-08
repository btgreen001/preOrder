import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreatePaymentIntentRequest {
  orderId: string;
  orderType: string;
  returnUrl: string;
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
  private readonly apiUrl = `${import.meta.env.NG_APP_API_URL}/payment`;

  createPaymentIntent(data: CreatePaymentIntentRequest): Observable<CreatePaymentIntentResponse> {
    const token = localStorage.getItem('authToken');

    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.post<CreatePaymentIntentResponse>(
      `${import.meta.env.NG_APP_API_URL}/create-intent`,
      data,
      { headers }
    );
  }
}
