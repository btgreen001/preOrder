import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Order {
  id: number;
  externalId: string; // UUID for API routing and display
  orderNumber: string;
  customerId: string;
  eventToken?: string;
  eventName?: string;
  orderDate: string;
  orderStatus: string;  // PENDING, CONFIRMED, COMPLETED, CANCELLED
  totalAmount: number;
  organizationId: string;
  specialInstructionTxt?: string;
  customerName?: string;
  items?: OrderLineItem[];
  pickupSlot?: OrderPickupSlot | null;
  organization?: OrganizationDtl; // Organization details including registration token
}

export interface OrganizationDtl {
  organizationId: string;
  organizationName: string;
  registrationToken?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface OrderLineItem {
  id: number;
  externalId: string;
  menuItemId: number;
  menuItemExternalId?: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customizations?: string;
}

export interface OrderPickupSlot {
  id: number;
  externalId: string;
  slotStartAt: string;
  slotEndAt: string;
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
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Get a specific order by external ID (UUID)
   * @param externalId - The UUID external_id from database
   */
  getOrderByExternalId(externalId: string): Observable<Order> {
    return this.http.get<Order>(`${environment.apiUrl}/public/preorders/${externalId}`);
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
   * Cancel an order
   * @param externalId - The UUID external_id from database
   */
  cancelOrder(externalId: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/${externalId}/cancel`, {});
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
