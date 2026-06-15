import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  id: number;
  externalId: string; // UUID for API routing and display
  orderNumber: string;
  customerId: string;
  orderDate: string;
  orderStatus: string;  // PENDING, CONFIRMED, COMPLETED, CANCELLED
  totalAmount: number;
  organizationId: string;
  specialInstructionTxt?: string;
  customerName?: string;
}

export interface CreateOrderRequest {
  customerId: string;
  orderItems: OrderItemRequest[];
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}
export interface UpdateOrderRequest {
  customerId?: string;
  specialInstructionTxt?: string;
}
export interface UpdateOrderStatusRequest {
  newStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly apiBaseUrl = window.__env.NG_APP_API_URL;
  private apiUrl: string;

  constructor() {
    this.apiUrl = `${this.apiBaseUrl}/orders`;
  }
  private readonly http = inject(HttpClient);

  /**
   * Get all orders for the organization
   */
  
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

   /**
     * Update order (CustomerId and SpecialInstructionTxt)
     */
    updateOrder(id: string, changes: UpdateOrderRequest): Observable<Order> {
      return this.http.put<Order>(`${this.apiUrl}/${id}`, changes);
    }
  /**
   * Get a specific order by ID
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }
  /**
   * Get a specific order by external ID (UUID)
   * @param externalId - The UUID external_id from database
   */
  getOrderById(externalId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${externalId}`);
  }

  /**
   * Create a new order
   */
  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, request);
  }

  /**
   * Update order status
   * @param externalId - The UUID external_id from database
   */
  updateOrderStatus(externalId: string, request: UpdateOrderStatusRequest): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${externalId}/status`, request);
  }

  // ===== Phase 2: Business Logic Methods =====

  /**
   * Validate order inventory before creation
   */
  validateOrderInventory(items: CreateOrderItemRequest[]): Observable<AvailabilityCheckResponse> {
    return this.http.post<AvailabilityCheckResponse>(`${this.apiUrl}/validate-inventory`, items);
  }

  /**
   * Check availability of a specific item
   * Note: This calls the Inventory API endpoint (moved from Orders)
   */
  checkAvailability(inventoryItemId: string, quantity: number): Observable<AvailabilityCheckResponse> {
    const request = { inventoryItemExternalId: inventoryItemId, quantity };
    return this.http.post<AvailabilityCheckResponse>(`${this.apiUrl}/inventory/check-availability`, request);
  }

  /**
   * Generate pick list for order fulfillment
   * @param externalId - The UUID external_id from database
   */
  generatePickList(externalId: string): Observable<PickListDto> {
    return this.http.get<PickListDto>(`${this.apiUrl}/${externalId}/pick-list`);
  }

  /**
   * Complete an order
   * @param externalId - The UUID external_id from database
   */
  completeOrder(externalId: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${externalId}/complete`, {});
  }

  /**
   * Cancel an order
   * @param externalId - The UUID external_id from database
   */
  cancelOrder(externalId: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${externalId}/cancel`, {});
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/by-status/${status}`);
  }
}

export interface CreateOrderItemRequest {
  sellableProductExternalId: string;
  quantity: number;
  customizations?: string;
}

export interface AvailabilityCheckResponse {
  allItemsAvailable: boolean;
  items: ItemAvailability[];
  message: string;
}

export interface ItemAvailability {
  inventoryItemId: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface PickListDto {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  items: PickListItemDto[];
  totalQuantity: number;
  specialInstructions: string;
}

export interface PickListItemDto {
  orderItemId: string;
  inventoryItemId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitOfMeasure: string;
  warehouseLocation?: string;
  batchNumber?: string;
  expirationDate?: string;
  customizations?: string;
}
