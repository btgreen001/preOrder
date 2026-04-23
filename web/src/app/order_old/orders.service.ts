import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customer?: string;
  customerId?: string;
  customerName?: string;
  status: OrderStatus;
  total?: number;
  totalAmount?: number;
  createdDate?: string;
  orderDate?: string;
  orderStatus?: string;
  specialInstructionTxt?: string | null;
}

export interface UpdateOrderRequest {
  customerId?: string;
  specialInstructionTxt?: string;
}

export interface UpdateOrderStatusRequest {
  newStatus: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Get all orders
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  /**
   * Get a specific order by ID
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new order
   */
  createOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order);
  }

  /**
   * Update order (CustomerId and SpecialInstructionTxt)
   */
  updateOrder(id: string, changes: UpdateOrderRequest): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${id}`, changes);
  }

  /**
   * Update order status
   */
  updateOrderStatus(id: string, newStatus: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${id}/status`, { newStatus });
  }

  /**
   * Delete an order
   */
  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Phase 2: Business Logic Endpoints

  /**
   * Validate order inventory before creation
   */
  validateOrderInventory(items: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-inventory`, { items });
  }

  /**
   * Check product availability for specific quantity
   */
  checkAvailability(productId: string, quantity: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/check-availability`, { productId, quantity });
  }

  /**
   * Generate pick list for order fulfillment
   */
  generatePickList(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${orderId}/pick-list`);
  }

  /**
   * Complete an order
   */
  completeOrder(orderId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${orderId}/complete`, { orderId });
  }

  /**
   * Cancel an order and release reservations
   */
  cancelOrder(orderId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${orderId}/cancel`, { orderId });
  }

  /**
   * Get orders filtered by status
   */
  getOrdersByStatus(status: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/by-status/${status}`);
  }
}
